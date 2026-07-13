import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";
import * as Transactions from "./transaction-service.js";

export const AGENT_LIMITS = {
  min: 1,
  max: 100000
};

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function normalizeProfile(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email || `hidden-${row.id}@nexapay.demo`,
    phone: row.phone || "",
    avatar_url: row.avatar_url || "",
    role: row.role || "customer",
    account_status: row.account_status || "active",
    created_at: row.created_at || now(),
    updated_at: row.updated_at || now()
  };
}

function normalizeAgent(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    agent_code: row.agent_code,
    location: row.location,
    status: row.status || "active",
    created_at: row.created_at || now(),
    profile: row.profile || {
      id: row.user_id,
      full_name: row.agent_name || "Registered Demo Agent",
      phone: row.agent_phone || "",
      role: "agent",
      account_status: "active"
    }
  };
}

function mirrorProfiles(rows) {
  if (!rows.length) return;
  const state = getState();
  rows.forEach((row) => upsertById(state.profiles, normalizeProfile(row)));
  saveState(state);
}

function mirrorAgent(agent) {
  if (!agent?.id) return;
  const state = getState();
  upsertById(state.agents, {
    id: agent.id,
    user_id: agent.user_id,
    agent_code: agent.agent_code,
    location: agent.location,
    status: agent.status || "active",
    created_at: agent.created_at || now()
  });
  if (agent.profile) upsertById(state.profiles, normalizeProfile(agent.profile));
  saveState(state);
}

function mirrorWallet(wallet) {
  if (!wallet?.id) return;
  const state = getState();
  upsertById(state.wallets, {
    ...wallet,
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || "BDT_DEMO",
    status: wallet.status || "active",
    updated_at: wallet.updated_at || now()
  });
  saveState(state);
}

function mirrorTransaction(tx) {
  if (!tx?.id) return;
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
}

function localAgent(userId) {
  return Wallet.getAgents().find((agent) => agent.user_id === userId) || null;
}

function localWallet(userId) {
  return Wallet.getDashboardData(userId).wallet;
}

function normalizeTransaction(tx) {
  const metadata = tx.metadata || {};
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: tx.sender_id || metadata.sender_user_id || null,
    receiver_id: tx.receiver_id || metadata.receiver_user_id || null,
    status: tx.status || "completed",
    metadata
  };
}

function validateAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) throw new Error("Enter a valid demo amount.");
  if (numericAmount < AGENT_LIMITS.min) throw new Error("The minimum agent transaction is 1 demo taka.");
  if (numericAmount > AGENT_LIMITS.max) throw new Error("The maximum agent transaction is 100,000 demo taka.");
  if (Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) > 0.000001) {
    throw new Error("Use at most two decimal places.");
  }
  return numericAmount;
}

function appendAuditOnce(actorId, action, tx, metadata = {}) {
  const state = getState();
  if (state.audit_logs.some((log) => log.action === action && log.entity_id === tx.id)) return;
  state.audit_logs.push({
    id: makeId("aud"),
    actor_id: actorId,
    action,
    entity_type: "transactions",
    entity_id: tx.id,
    metadata,
    created_at: now()
  });
  saveState(state);
}

async function refreshWallet(userId) {
  if (!isSupabaseSession()) return localWallet(userId);
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("id, user_id, balance, currency, status, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) mirrorWallet(data);
  return data ? { ...data, balance: Number(data.balance || 0) } : localWallet(userId);
}

export function createAgentRequestId(kind, userId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `agent-${kind}:${userId}:${random}`;
}

export function calculateCashOutFee(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.round(numericAmount * 0.01 * 100) / 100;
}

export async function getAgentRecord(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("agents")
      .select("id, user_id, agent_code, location, status, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const agent = normalizeAgent(data);
    if (agent) mirrorAgent(agent);
    return agent || localAgent(userId);
  }

  return localAgent(userId);
}

export async function getAgentWallet(userId) {
  return refreshWallet(userId);
}

export async function searchCustomers(query = "", agentUserId = "") {
  const normalized = query.trim().toLowerCase();
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("search_demo_profiles", { p_query: normalized });
    if (error) throw new Error(error.message);
    const rows = (data || [])
      .filter((profile) => profile.role === "customer" && profile.id !== agentUserId)
      .map(normalizeProfile);
    mirrorProfiles(rows);
    return rows;
  }

  return Wallet.getContacts({ includeRoles: ["customer"], excludeUserId: agentUserId })
    .filter((profile) => {
      if (!normalized) return true;
      return `${profile.full_name} ${profile.phone}`.toLowerCase().includes(normalized);
    })
    .slice(0, 30);
}

export async function listAgentTransactions(userId) {
  const rows = await Transactions.listTransactions(userId);
  return rows.map(normalizeTransaction).filter((tx) => (
    tx.sender_id === userId ||
    tx.receiver_id === userId ||
    tx.metadata?.agent_user_id === userId
  ));
}

export function isCashIn(tx, userId) {
  return tx.transaction_type === "add_money" && tx.sender_id === userId && tx.metadata?.channel === "agent_cash_in";
}

export function isCashOut(tx, userId) {
  return tx.transaction_type === "cash_out" && (tx.receiver_id === userId || tx.metadata?.agent_user_id === userId);
}

export function filterAgentTransactions(transactions, { userId, filter = "all", status = "all", query = "", from = "", to = "" }) {
  const base = transactions.filter((tx) => (
    filter === "all" ||
    (filter === "cash_in" && isCashIn(tx, userId)) ||
    (filter === "cash_out" && isCashOut(tx, userId))
  ));
  return Transactions.filterTransactions(base, { userId, filter: "all", status, query, from, to });
}

export function summarizeAgentTransactions(transactions, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const completed = transactions.filter((tx) => tx.status === "completed");
  const cashIns = completed.filter((tx) => isCashIn(tx, userId));
  const cashOuts = completed.filter((tx) => isCashOut(tx, userId));
  const todayTransactions = completed.filter((tx) => tx.created_at.slice(0, 10) === today);
  const totalVolume = completed.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return {
    count: transactions.length,
    completed: completed.length,
    pending: transactions.filter((tx) => tx.status === "pending").length,
    todayCount: todayTransactions.length,
    todayVolume: todayTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    totalVolume,
    cashInCount: cashIns.length,
    cashInAmount: cashIns.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    cashOutCount: cashOuts.length,
    cashOutAmount: cashOuts.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  };
}

export async function getAgentDashboard(userId) {
  const [agent, wallet, transactions] = await Promise.all([
    getAgentRecord(userId),
    getAgentWallet(userId),
    listAgentTransactions(userId)
  ]);
  return {
    agent,
    wallet,
    transactions,
    summary: summarizeAgentTransactions(transactions, userId)
  };
}

export async function processCashIn({ agentUserId, customer, amount, idempotencyKey }) {
  const numericAmount = validateAmount(amount);
  if (!customer?.id || customer.role !== "customer") throw new Error("Choose a registered demo customer.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("agent_cash_in_demo_money", {
      p_customer_user_id: customer.id,
      p_amount: numericAmount,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    const tx = normalizeTransaction(data);
    mirrorProfiles([customer]);
    mirrorTransaction(tx);
    await refreshWallet(agentUserId);
    return tx;
  }

  const agent = await getAgentRecord(agentUserId);
  const tx = Wallet.transferDemoMoney({
    senderId: agentUserId,
    receiverId: customer.id,
    amount: numericAmount,
    type: "add_money",
    reference: "Agent cash-in simulation",
    metadata: {
      channel: "agent_cash_in",
      agent_id: agent?.id,
      agent_user_id: agentUserId,
      agent_code: agent?.agent_code,
      agent_location: agent?.location,
      customer_user_id: customer.id,
      customer_name: customer.full_name,
      simulation_only: true
    },
    idempotencyKey
  });
  appendAuditOnce(agentUserId, "agent_cash_in", tx, { customer_id: customer.id, amount: numericAmount, idempotency_key: idempotencyKey });
  return tx;
}

export async function processCashOut({ agentUserId, customer, amount, idempotencyKey }) {
  const numericAmount = validateAmount(amount);
  if (!customer?.id || customer.role !== "customer") throw new Error("Choose a registered demo customer.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("agent_cash_out_demo_money", {
      p_customer_user_id: customer.id,
      p_amount: numericAmount,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    const tx = normalizeTransaction(data);
    mirrorProfiles([customer]);
    mirrorTransaction(tx);
    await refreshWallet(agentUserId);
    return tx;
  }

  const agent = await getAgentRecord(agentUserId);
  const tx = Wallet.cashOut({
    userId: customer.id,
    agentId: agent.id,
    amount: numericAmount,
    idempotencyKey
  });
  appendAuditOnce(agentUserId, "agent_cash_out", tx, { customer_id: customer.id, amount: numericAmount, fee: calculateCashOutFee(numericAmount), idempotency_key: idempotencyKey });
  return tx;
}
