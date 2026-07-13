import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const SEND_LIMITS = {
  min: 1,
  max: 100000
};

function now() {
  return new Date().toISOString();
}

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function normalizeQuery(value = "") {
  return value.trim().toLowerCase();
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
  } else {
    list.push(row);
  }
}

function mirrorRecipient(recipient) {
  if (!recipient?.id) return;
  const state = getState();
  upsertById(state.profiles, {
    id: recipient.id,
    full_name: recipient.full_name,
    email: recipient.email || `hidden-${recipient.id}@nexapay.demo`,
    phone: recipient.phone,
    avatar_url: recipient.avatar_url || "",
    role: recipient.role || "customer",
    account_status: "active",
    created_at: recipient.created_at || now(),
    updated_at: now()
  });
  saveState(state);
}

function mirrorOwnWallet(wallet) {
  if (!wallet?.id) return;
  const state = getState();
  upsertById(state.wallets, {
    id: wallet.id,
    user_id: wallet.user_id,
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || "BDT_DEMO",
    status: wallet.status || "active",
    created_at: wallet.created_at,
    updated_at: wallet.updated_at || now()
  });
  saveState(state);
}

function normalizeSupabaseTransaction(tx, { senderId, receiver }) {
  const metadata = tx.metadata || {};
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: metadata.sender_user_id || senderId,
    receiver_id: metadata.receiver_user_id || receiver.id,
    metadata
  };
}

function mirrorTransaction(tx) {
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
}

function validateSendInput({ receiverId, amount }) {
  const numericAmount = Number(amount);
  if (!receiverId) throw new Error("Choose a demo recipient.");
  if (!Number.isFinite(numericAmount)) throw new Error("Enter a valid demo amount.");
  if (numericAmount < SEND_LIMITS.min) throw new Error("The minimum send amount is 1 demo taka.");
  if (numericAmount > SEND_LIMITS.max) throw new Error("The maximum send amount is 100,000 demo taka.");
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) {
    throw new Error("Use at most two decimal places.");
  }
  return numericAmount;
}

export function getSendModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createTransferRequestId(senderId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `send:${senderId}:${random}`;
}

export function getInitialRecipients(currentUserId) {
  if (isSupabaseSession()) return [];
  return Wallet.getContacts({ includeRoles: ["customer"], excludeUserId: currentUserId });
}

export async function searchRecipients(query, currentUserId) {
  const normalized = normalizeQuery(query);
  if (isSupabaseSession()) {
    if (normalized.length < 3) throw new Error("Enter at least 3 characters of a demo name or phone number.");
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("search_demo_profiles", { p_query: normalized });
    if (error) throw new Error(error.message);
    return (data || [])
      .filter((profile) => profile.role === "customer" && profile.id !== currentUserId)
      .map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        role: profile.role
      }));
  }

  return Wallet.getContacts({ includeRoles: ["customer"], excludeUserId: currentUserId })
    .filter((profile) => {
      if (!normalized) return true;
      return profile.full_name.toLowerCase().includes(normalized) || profile.phone.toLowerCase().includes(normalized);
    })
    .slice(0, 12);
}

export async function submitSendMoney({ senderId, receiver, amount, reference, idempotencyKey }) {
  const numericAmount = validateSendInput({ receiverId: receiver?.id, amount });
  if (receiver.id === senderId) throw new Error("This demo does not allow sending money to yourself.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("transfer_demo_money", {
      p_receiver_user_id: receiver.id,
      p_amount: numericAmount,
      p_reference: reference || "Personal",
      p_transaction_type: "send_money",
      p_metadata: {
        channel: "nexapay_web_demo",
        receiver_phone: receiver.phone,
        educational_demo: true
      },
      p_idempotency_key: idempotencyKey
    });

    if (error) throw new Error(error.message);

    mirrorRecipient(receiver);
    const normalizedTx = normalizeSupabaseTransaction(data, { senderId, receiver });
    mirrorTransaction(normalizedTx);

    const walletResult = await supabase
      .from("wallets")
      .select("id, user_id, balance, currency, status, created_at, updated_at")
      .eq("user_id", senderId)
      .maybeSingle();

    if (!walletResult.error && walletResult.data) {
      mirrorOwnWallet(walletResult.data);
    }

    return normalizedTx;
  }

  return Wallet.transferDemoMoney({
    senderId,
    receiverId: receiver.id,
    amount: numericAmount,
    type: "send_money",
    reference: reference || "Personal",
    metadata: {
      channel: "local_demo",
      confirmation: "demo_word"
    },
    idempotencyKey
  });
}
