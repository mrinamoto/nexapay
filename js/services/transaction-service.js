import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";
import { money, dateTime, txLabel } from "../utils/format.js";

export const TRANSACTION_FILTERS = [
  { id: "all", label: "All" },
  { id: "money_in", label: "Money In" },
  { id: "money_out", label: "Money Out" },
  { id: "payment", label: "Payment" },
  { id: "recharge", label: "Recharge" },
  { id: "bill", label: "Bill" },
  { id: "bank", label: "Bank" },
  { id: "savings", label: "Savings" },
  { id: "donation", label: "Donation" }
];

export const STATUS_OPTIONS = ["all", "completed", "pending", "failed", "cancelled"];

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function walletByUser(userId) {
  return getState().wallets.find((wallet) => wallet.user_id === userId);
}

function profileById(userId) {
  return getState().profiles.find((profile) => profile.id === userId);
}

function userIdByWallet(walletId) {
  return getState().wallets.find((wallet) => wallet.id === walletId)?.user_id || null;
}

function normalizeTransaction(tx, userId = "") {
  const metadata = tx.metadata || {};
  const senderId = tx.sender_id || metadata.sender_user_id || userIdByWallet(tx.sender_wallet_id);
  const receiverId = tx.receiver_id || metadata.receiver_user_id || userIdByWallet(tx.receiver_wallet_id);
  return {
    ...tx,
    sender_id: senderId || null,
    receiver_id: receiverId || null,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    status: tx.status || "completed",
    metadata,
    direction: directionFor({ ...tx, sender_id: senderId, receiver_id: receiverId, metadata }, userId)
  };
}

function mirrorTransactions(rows) {
  const state = getState();
  rows.forEach((row) => upsertById(state.transactions, row));
  saveState(state);
}

export function directionFor(tx, userId) {
  if (tx.receiver_id === userId) return "in";
  if (tx.transaction_type === "add_money" && !tx.sender_id) return "in";
  return "out";
}

export function statusClass(status = "completed") {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "pending") return "warning";
  if (normalized === "failed" || normalized === "cancelled") return "danger";
  return "";
}

export function partiesFor(tx) {
  const sender = profileById(tx.sender_id);
  const receiver = profileById(tx.receiver_id);
  return {
    senderName: sender?.full_name || tx.metadata?.sender_name || "Demo source",
    senderPhone: sender?.phone || tx.metadata?.sender_phone || "",
    receiverName: receiver?.full_name || tx.metadata?.receiver_name || tx.metadata?.merchant_name || tx.metadata?.organization_name || "Demo destination",
    receiverPhone: receiver?.phone || tx.metadata?.receiver_phone || ""
  };
}

export async function listTransactions(userId) {
  if (isSupabaseSession()) {
    const ownWallet = walletByUser(userId);
    const supabase = await getSupabaseClient();
    let walletId = ownWallet?.id || "";
    if (!walletId) {
      const walletResult = await supabase
        .from("wallets")
        .select("id, user_id, balance, currency, status, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!walletResult.error && walletResult.data) {
        walletId = walletResult.data.id;
        const state = getState();
        upsertById(state.wallets, walletResult.data);
        saveState(state);
      }
    }

    if (walletId) {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, transaction_id, transaction_type, sender_wallet_id, receiver_wallet_id, amount, fee, total_amount, status, reference, metadata, idempotency_key, created_at")
        .or(`sender_wallet_id.eq.${walletId},receiver_wallet_id.eq.${walletId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      const normalized = (data || []).map((tx) => normalizeTransaction(tx, userId));
      mirrorTransactions(normalized);
      return normalized;
    }
  }

  return Wallet.getTransactionsForUser(userId).map((tx) => normalizeTransaction(tx, userId));
}

export async function getTransactionById(userId, id) {
  const transactions = await listTransactions(userId);
  return transactions.find((tx) => tx.id === id || tx.transaction_id === id) || null;
}

export function matchesFilter(tx, filter, userId) {
  const direction = directionFor(tx, userId);
  return (
    filter === "all" ||
    (filter === "money_in" && direction === "in") ||
    (filter === "money_out" && direction === "out") ||
    (filter === "payment" && tx.transaction_type === "merchant_payment") ||
    (filter === "recharge" && tx.transaction_type === "recharge") ||
    (filter === "bill" && tx.transaction_type === "bill_payment") ||
    (filter === "bank" && tx.transaction_type === "bank_transfer") ||
    (filter === "savings" && tx.transaction_type.startsWith("savings_")) ||
    (filter === "donation" && tx.transaction_type === "donation")
  );
}

export function searchText(tx) {
  const parties = partiesFor(tx);
  return [
    tx.transaction_id,
    tx.transaction_type,
    tx.status,
    tx.reference,
    parties.senderName,
    parties.senderPhone,
    parties.receiverName,
    parties.receiverPhone,
    tx.metadata?.merchant_name,
    tx.metadata?.organization_name,
    tx.metadata?.provider_name,
    tx.metadata?.operator_name,
    tx.metadata?.bank_name,
    tx.metadata?.agent_name,
    tx.metadata?.phone,
    JSON.stringify(tx.metadata || {})
  ].filter(Boolean).join(" ").toLowerCase();
}

export function filterTransactions(transactions, { userId, filter = "all", status = "all", query = "", from = "", to = "" }) {
  const term = query.trim().toLowerCase();
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;

  return transactions.filter((tx) => {
    const created = new Date(tx.created_at);
    const statusOk = status === "all" || tx.status === status;
    const fromOk = !fromDate || created >= fromDate;
    const toOk = !toDate || created <= toDate;
    const searchOk = !term || searchText(tx).includes(term);
    return matchesFilter(tx, filter, userId) && statusOk && fromOk && toOk && searchOk;
  });
}

export function summarizeTransactions(transactions, userId) {
  return transactions.reduce((summary, tx) => {
    const direction = directionFor(tx, userId);
    summary.count += 1;
    summary.totalVolume += Number(tx.amount || 0);
    if (direction === "in") summary.moneyIn += Number(tx.amount || 0);
    else summary.moneyOut += Number(tx.total_amount || tx.amount || 0);
    if (tx.status === "completed") summary.completed += 1;
    if (tx.status === "pending") summary.pending += 1;
    return summary;
  }, { count: 0, moneyIn: 0, moneyOut: 0, totalVolume: 0, completed: 0, pending: 0 });
}

export function receiptLines(tx, userId = "") {
  const direction = userId ? directionFor(tx, userId) : "out";
  const parties = partiesFor(tx);
  return [
    "NexaPay Demo Receipt",
    "Educational Demo - No Real Money or Financial Transactions",
    "This receipt is proof of a simulated database event only.",
    `Transaction ID: ${tx.transaction_id}`,
    `Type: ${txLabel(tx.transaction_type)}`,
    `Status: ${tx.status}`,
    `Direction: ${direction === "in" ? "Money In" : "Money Out"}`,
    `Amount: ${money(tx.amount)}`,
    `Fee: ${money(tx.fee)}`,
    `Total: ${money(tx.total_amount)}`,
    `Sender: ${parties.senderName}${parties.senderPhone ? ` (${parties.senderPhone})` : ""}`,
    `Receiver: ${parties.receiverName}${parties.receiverPhone ? ` (${parties.receiverPhone})` : ""}`,
    ...(tx.metadata?.merchant_name ? [`Merchant: ${tx.metadata.merchant_name}`] : []),
    ...(tx.metadata?.source ? [`Demo source: ${tx.metadata.source}`] : []),
    ...(tx.metadata?.agent_name ? [`Registered agent: ${tx.metadata.agent_name} (${tx.metadata.agent_code || "Demo agent"})`] : []),
    ...(tx.metadata?.operator_name ? [`Fictional operator: ${tx.metadata.operator_name}`] : []),
    ...(tx.metadata?.phone ? [`Demo phone: ${tx.metadata.phone}`] : []),
    ...(tx.metadata?.provider_name ? [`Fictional provider: ${tx.metadata.provider_name}`] : []),
    ...(tx.metadata?.demo_account_number ? [`Demo account: ${tx.metadata.demo_account_number}`] : []),
    ...(tx.metadata?.bank_name ? [`Demo bank: ${tx.metadata.bank_name}`] : []),
    ...(tx.metadata?.fictional_account_number ? [`Fictional account: ${tx.metadata.fictional_account_number}`] : []),
    ...(tx.metadata?.savings_goal_title ? [`Savings goal: ${tx.metadata.savings_goal_title}`] : []),
    ...(tx.metadata?.savings_direction ? [`Savings action: ${txLabel(tx.metadata.savings_direction)}`] : []),
    ...(tx.metadata?.organization_name ? [`Fictional organization: ${tx.metadata.organization_name}`] : []),
    ...(tx.metadata?.message ? [`Demo message: ${tx.metadata.message}`] : []),
    `Reference: ${tx.reference || "-"}`,
    `Date: ${dateTime(tx.created_at)}`
  ];
}

export function receiptText(tx, userId = "") {
  return receiptLines(tx, userId).join("\n");
}
