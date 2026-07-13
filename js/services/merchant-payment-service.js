import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const MERCHANT_PAYMENT_LIMITS = {
  min: 1,
  max: 100000
};

function now() {
  return new Date().toISOString();
}

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
  } else {
    list.push(row);
  }
}

function normalizeMerchant(row) {
  if (!row) return null;
  return {
    id: row.id,
    owner_id: row.owner_id,
    business_name: row.business_name,
    category: row.category,
    merchant_code: row.merchant_code,
    qr_identifier: row.qr_identifier,
    status: row.status || "active",
    owner: row.owner || {
      id: row.owner_id,
      full_name: row.owner_name || row.business_name,
      phone: row.owner_phone || "",
      role: "merchant"
    },
    created_at: row.created_at || now()
  };
}

function mirrorMerchant(merchant) {
  if (!merchant?.id) return;
  const state = getState();
  upsertById(state.profiles, {
    id: merchant.owner_id,
    full_name: merchant.owner?.full_name || merchant.business_name,
    email: merchant.owner?.email || `hidden-${merchant.owner_id}@nexapay.demo`,
    phone: merchant.owner?.phone || `merchant-${merchant.merchant_code}`,
    avatar_url: "",
    role: "merchant",
    account_status: "active",
    created_at: merchant.created_at || now(),
    updated_at: now()
  });
  upsertById(state.merchants, {
    id: merchant.id,
    owner_id: merchant.owner_id,
    business_name: merchant.business_name,
    category: merchant.category,
    merchant_code: merchant.merchant_code,
    qr_identifier: merchant.qr_identifier,
    status: merchant.status || "active",
    created_at: merchant.created_at || now()
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

function mirrorTransaction(tx) {
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
}

function normalizeSupabaseTransaction(tx, { customerId, merchant }) {
  const metadata = tx.metadata || {};
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: metadata.sender_user_id || customerId,
    receiver_id: metadata.receiver_user_id || merchant.owner_id,
    metadata
  };
}

function validateAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) throw new Error("Enter a valid demo payment amount.");
  if (numericAmount < MERCHANT_PAYMENT_LIMITS.min) throw new Error("The minimum merchant payment is 1 demo taka.");
  if (numericAmount > MERCHANT_PAYMENT_LIMITS.max) throw new Error("The maximum merchant payment is 100,000 demo taka.");
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) throw new Error("Use at most two decimal places.");
  return numericAmount;
}

export function getMerchantPaymentModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createMerchantPaymentId(customerId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `merchant-payment:${customerId}:${random}`;
}

export function getInitialMerchants() {
  if (isSupabaseSession()) return [];
  return Wallet.getMerchants().filter((merchant) => merchant.status === "active");
}

export async function searchMerchants(query = "") {
  const normalized = query.trim().toLowerCase();
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("search_demo_merchants", { p_query: normalized });
    if (error) throw new Error(error.message);
    return (data || []).map(normalizeMerchant).filter(Boolean);
  }

  return Wallet.getMerchants()
    .filter((merchant) => merchant.status === "active")
    .filter((merchant) => {
      if (!normalized) return true;
      return (
        merchant.business_name.toLowerCase().includes(normalized) ||
        merchant.category.toLowerCase().includes(normalized) ||
        merchant.merchant_code.toLowerCase().includes(normalized)
      );
    });
}

export async function getMerchantByQr(qrIdentifier) {
  const safeQr = (qrIdentifier || "").trim();
  if (!safeQr) throw new Error("Enter a NexaPay demo merchant QR identifier.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("get_demo_merchant_by_qr", { p_qr_identifier: safeQr });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return normalizeMerchant(row);
  }

  return Wallet.findMerchantByQr(safeQr) || null;
}

export function qrValueForMerchant(merchant) {
  return merchant?.qr_identifier || "";
}

export async function submitMerchantPayment({ customerId, merchant, amount, reference, idempotencyKey, channel = "merchant_payment" }) {
  const numericAmount = validateAmount(amount);
  if (!merchant?.id || !merchant?.owner_id) throw new Error("Choose an active demo merchant.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("transfer_demo_money", {
      p_receiver_user_id: merchant.owner_id,
      p_amount: numericAmount,
      p_reference: reference || "Merchant payment",
      p_transaction_type: "merchant_payment",
      p_metadata: {
        channel,
        merchant_id: merchant.id,
        merchant_name: merchant.business_name,
        merchant_code: merchant.merchant_code,
        category: merchant.category,
        educational_demo: true
      },
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);

    mirrorMerchant(merchant);
    const normalizedTx = normalizeSupabaseTransaction(data, { customerId, merchant });
    mirrorTransaction(normalizedTx);

    const walletResult = await supabase
      .from("wallets")
      .select("id, user_id, balance, currency, status, created_at, updated_at")
      .eq("user_id", customerId)
      .maybeSingle();

    if (!walletResult.error && walletResult.data) mirrorOwnWallet(walletResult.data);
    return normalizedTx;
  }

  return Wallet.merchantPayment({
    customerId,
    merchantId: merchant.id,
    amount: numericAmount,
    reference: reference || "Merchant payment",
    idempotencyKey
  });
}
