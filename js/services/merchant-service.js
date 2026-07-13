import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";
import * as Transactions from "./transaction-service.js";
import { sanitizeDemoAssetUrl } from "../utils/security.js";

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function now() {
  return new Date().toISOString();
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function mirrorMerchant(merchant) {
  if (!merchant?.id) return;
  const state = getState();
  upsertById(state.merchants, merchant);
  saveState(state);
}

function mirrorProfile(profile) {
  if (!profile?.id) return;
  const state = getState();
  upsertById(state.profiles, {
    ...profile,
    avatar_url: profile.avatar_url || "",
    updated_at: profile.updated_at || now()
  });
  saveState(state);
}

function mirrorWallet(wallet) {
  if (!wallet?.id) return;
  const state = getState();
  upsertById(state.wallets, {
    ...wallet,
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || "BDT_DEMO",
    updated_at: wallet.updated_at || now()
  });
  saveState(state);
}

function localMerchant(userId) {
  return Wallet.getMerchants().find((merchant) => merchant.owner_id === userId) || null;
}

function localWallet(userId) {
  return Wallet.getDashboardData(userId).wallet;
}

function validateMerchantFields(fields) {
  const businessName = (fields.business_name || "").trim();
  const category = (fields.category || "").trim();
  const fullName = (fields.full_name || "").trim();
  const phone = (fields.phone || "").trim();

  if (businessName.length < 2 || businessName.length > 140) throw new Error("Business name must be 2 to 140 characters.");
  if (category.length < 2 || category.length > 80) throw new Error("Category must be 2 to 80 characters.");
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Owner name must be 2 to 120 characters.");
  if (!/^[0-9+ -]{8,20}$/.test(phone)) throw new Error("Enter a valid demo phone number.");

  return {
    business_name: businessName,
    category,
    full_name: fullName,
    phone,
    avatar_url: sanitizeDemoAssetUrl(fields.avatar_url || "")
  };
}

export function qrPayload(merchant) {
  return merchant?.qr_identifier || "";
}

export async function getMerchantRecord(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("merchants")
      .select("id, owner_id, business_name, category, merchant_code, qr_identifier, status, created_at")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) mirrorMerchant(data);
    return data || localMerchant(userId);
  }

  return localMerchant(userId);
}

export async function getMerchantWallet(userId) {
  if (isSupabaseSession()) {
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

  return localWallet(userId);
}

export async function listMerchantPayments(userId) {
  const transactions = await Transactions.listTransactions(userId);
  return transactions.filter((tx) => (
    tx.transaction_type === "merchant_payment" &&
    (tx.receiver_id === userId || tx.metadata?.receiver_user_id === userId)
  ));
}

export function filterPayments(payments, { userId, query = "", status = "all", from = "", to = "" } = {}) {
  return Transactions.filterTransactions(payments, {
    userId,
    filter: "payment",
    query,
    status,
    from,
    to
  });
}

export function summarizePayments(payments) {
  const today = new Date().toISOString().slice(0, 10);
  const completed = payments.filter((tx) => tx.status === "completed");
  const todayPayments = completed.filter((tx) => tx.created_at.slice(0, 10) === today);
  const totalAmount = completed.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const todayAmount = todayPayments.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const amount = completed
      .filter((tx) => tx.created_at.slice(0, 10) === key)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return { key, label: date.toLocaleDateString("en", { weekday: "short" }), amount };
  });

  return {
    count: payments.length,
    completed: completed.length,
    pending: payments.filter((tx) => tx.status === "pending").length,
    todayCount: todayPayments.length,
    todayAmount,
    totalAmount,
    averageAmount: completed.length ? totalAmount / completed.length : 0,
    lastSevenDays
  };
}

export async function getMerchantDashboard(userId) {
  const [merchant, wallet, payments] = await Promise.all([
    getMerchantRecord(userId),
    getMerchantWallet(userId),
    listMerchantPayments(userId)
  ]);
  return {
    merchant,
    wallet,
    payments,
    summary: summarizePayments(payments)
  };
}

export async function updateMerchantProfile(userId, fields) {
  const safe = validateMerchantFields(fields);

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const profileResult = await supabase
      .from("profiles")
      .update({
        full_name: safe.full_name,
        phone: safe.phone,
        avatar_url: safe.avatar_url,
        updated_at: now()
      })
      .eq("id", userId)
      .select("id, full_name, email, phone, avatar_url, role, account_status, created_at, updated_at")
      .maybeSingle();
    if (profileResult.error) throw new Error(profileResult.error.message);

    const merchantResult = await supabase
      .from("merchants")
      .update({
        business_name: safe.business_name,
        category: safe.category
      })
      .eq("owner_id", userId)
      .select("id, owner_id, business_name, category, merchant_code, qr_identifier, status, created_at")
      .maybeSingle();
    if (merchantResult.error) throw new Error(merchantResult.error.message);

    mirrorProfile(profileResult.data);
    mirrorMerchant(merchantResult.data);
    return { profile: profileResult.data, merchant: merchantResult.data };
  }

  const state = getState();
  const profile = state.profiles.find((item) => item.id === userId);
  const merchant = state.merchants.find((item) => item.owner_id === userId);
  if (!profile || !merchant) throw new Error("Merchant profile was not found.");

  profile.full_name = safe.full_name;
  profile.phone = safe.phone;
  profile.avatar_url = safe.avatar_url;
  profile.updated_at = now();
  merchant.business_name = safe.business_name;
  merchant.category = safe.category;
  state.audit_logs.push({
    id: `aud_${Date.now().toString(36)}`,
    actor_id: userId,
    action: "update_merchant_profile",
    entity_type: "merchants",
    entity_id: merchant.id,
    metadata: { business_name: safe.business_name, category: safe.category },
    created_at: now()
  });
  saveState(state);
  return { profile, merchant };
}
