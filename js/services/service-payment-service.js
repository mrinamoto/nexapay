import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const RECHARGE_AMOUNTS = [20, 50, 100, 200];

export const SERVICE_LIMITS = {
  recharge: { min: 20, max: 5000 },
  bill_payment: { min: 1, max: 100000 },
  bank_transfer: { min: 1, max: 100000 }
};

function now() {
  return new Date().toISOString();
}

function randomId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function mirrorOwnWallet(wallet) {
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
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
}

function normalizeTransaction(tx, userId) {
  const metadata = tx.metadata || {};
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: metadata.sender_user_id || userId,
    receiver_id: metadata.receiver_user_id || null,
    metadata
  };
}

async function refreshOwnWallet(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("id, user_id, balance, currency, status, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!error && data) mirrorOwnWallet(data);
}

function activeRows(tableName) {
  return getState()[tableName].filter((item) => item.status === "active");
}

function normalizePhone(phone = "") {
  return phone.replace(/[\s-]/g, "").trim();
}

function validateAmount(amount, type, label) {
  const numericAmount = Number(amount);
  const limits = SERVICE_LIMITS[type];
  if (!Number.isFinite(numericAmount)) throw new Error(`Enter a valid ${label} amount.`);
  if (numericAmount < limits.min) throw new Error(`The minimum ${label} amount is ${limits.min} demo taka.`);
  if (numericAmount > limits.max) throw new Error(`The maximum ${label} amount is ${limits.max.toLocaleString("en-BD")} demo taka.`);
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) throw new Error("Use at most two decimal places.");
  return numericAmount;
}

function validateRechargePhone(phone) {
  const normalized = normalizePhone(phone);
  if (!/^[0-9]{8,15}$/.test(normalized)) throw new Error("Enter an 8 to 15 digit demo phone number.");
  return normalized;
}

function validateDemoAccountNumber(value = "", label = "demo account number") {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(normalized)) throw new Error(`Enter a valid fictional ${label}.`);
  return normalized;
}

function validateReference(value = "") {
  const normalized = value.trim();
  if (normalized.length > 120) throw new Error("Reference is too long.");
  return normalized;
}

function requireActive(row, message) {
  if (!row || row.status !== "active") throw new Error(message);
  return row;
}

async function runServicePayment({ userId, amount, type, reference, metadata, idempotencyKey }) {
  if (!idempotencyKey || idempotencyKey.length < 16) throw new Error("A service request identifier is required.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("service_payment", {
      p_amount: amount,
      p_transaction_type: type,
      p_reference: reference || null,
      p_metadata: metadata,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    const tx = normalizeTransaction(data, userId);
    mirrorTransaction(tx);
    await refreshOwnWallet(userId);
    return tx;
  }

  return Wallet.servicePayment({
    userId,
    amount,
    type,
    reference,
    metadata,
    idempotencyKey
  });
}

export function getServiceModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createServiceRequestId(kind, userId) {
  return `service:${kind}:${userId}:${randomId()}`;
}

export async function listRechargeOperators() {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("recharge_operators")
      .select("id, name, logo_url, status")
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    return data || [];
  }
  return activeRows("recharge_operators");
}

export async function listBillCategories() {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("bill_categories")
      .select("id, name, icon, status")
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    return data || [];
  }
  return activeRows("bill_categories");
}

export async function listBillProviders() {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("bill_providers")
      .select("id, category_id, name, logo_url, status")
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    return data || [];
  }
  return activeRows("bill_providers");
}

export async function listBanks() {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("banks")
      .select("id, name, status")
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    return data || [];
  }
  return activeRows("banks");
}

export async function submitRecharge({ userId, phone, operator, planType, amount, idempotencyKey }) {
  const selectedOperator = requireActive(operator, "Choose an active fictional recharge operator.");
  const demoPhone = validateRechargePhone(phone);
  const numericAmount = validateAmount(amount, "recharge", "recharge");
  const normalizedPlan = ["prepaid", "postpaid"].includes(String(planType).toLowerCase()) ? String(planType).toLowerCase() : "prepaid";

  return runServicePayment({
    userId,
    amount: numericAmount,
    type: "recharge",
    reference: demoPhone,
    idempotencyKey,
    metadata: {
      channel: "mobile_recharge_simulation",
      service_type: "mobile_recharge",
      phone: demoPhone,
      operator_id: selectedOperator.id,
      operator_name: selectedOperator.name,
      plan_type: normalizedPlan,
      simulation_only: true,
      educational_demo: true,
      notice: "No real mobile recharge is performed."
    }
  });
}

export async function submitBillPayment({ userId, category, provider, accountNumber, amount, idempotencyKey }) {
  const selectedCategory = requireActive(category, "Choose an active fictional bill category.");
  const selectedProvider = requireActive(provider, "Choose an active fictional bill provider.");
  if (selectedProvider.category_id !== selectedCategory.id) throw new Error("Choose a provider from the selected bill category.");
  const demoAccountNumber = validateDemoAccountNumber(accountNumber, "bill account number");
  const numericAmount = validateAmount(amount, "bill_payment", "bill payment");

  return runServicePayment({
    userId,
    amount: numericAmount,
    type: "bill_payment",
    reference: demoAccountNumber,
    idempotencyKey,
    metadata: {
      channel: "bill_payment_simulation",
      service_type: "bill_payment",
      category_id: selectedCategory.id,
      category_name: selectedCategory.name,
      provider_id: selectedProvider.id,
      provider_name: selectedProvider.name,
      demo_account_number: demoAccountNumber,
      simulation_only: true,
      educational_demo: true,
      notice: "No real bill-payment system is connected."
    }
  });
}

export async function submitBankTransfer({ userId, bank, accountNumber, receiverName, amount, reference, idempotencyKey }) {
  const selectedBank = requireActive(bank, "Choose an active fictional demo bank.");
  const fictionalAccountNumber = validateDemoAccountNumber(accountNumber, "bank account number");
  const normalizedReceiverName = receiverName.trim();
  if (normalizedReceiverName.length < 2 || normalizedReceiverName.length > 80) throw new Error("Enter a fictional receiver name between 2 and 80 characters.");
  const numericAmount = validateAmount(amount, "bank_transfer", "bank transfer");
  const safeReference = validateReference(reference) || "Demo Bank Transfer";

  return runServicePayment({
    userId,
    amount: numericAmount,
    type: "bank_transfer",
    reference: safeReference,
    idempotencyKey,
    metadata: {
      channel: "bank_transfer_simulation",
      service_type: "bank_transfer",
      bank_id: selectedBank.id,
      bank_name: selectedBank.name,
      fictional_account_number: fictionalAccountNumber,
      receiver_name: normalizedReceiverName,
      simulation_only: true,
      educational_demo: true,
      notice: "No real bank account is contacted."
    }
  });
}
