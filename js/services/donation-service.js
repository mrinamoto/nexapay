import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const DONATION_LIMITS = {
  min: 1,
  max: 100000
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
    receiver_id: null,
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

function validateAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < DONATION_LIMITS.min) throw new Error("Enter a donation amount greater than zero.");
  if (numericAmount > DONATION_LIMITS.max) throw new Error("The maximum demo donation is 100,000.");
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) throw new Error("Use at most two decimal places.");
  return Number(numericAmount.toFixed(2));
}

function validateMessage(message = "") {
  const clean = message.trim();
  if (clean.length > 240) throw new Error("Donation message is too long.");
  return clean;
}

export function getDonationModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createDonationRequestId(userId) {
  return `donation:${userId}:${randomId()}`;
}

export async function listDonationOrganizations() {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("donation_organizations")
      .select("id, name, description, status")
      .eq("status", "active")
      .order("name");
    if (error) throw new Error(error.message);
    return data || [];
  }

  return getState().donation_organizations.filter((organization) => organization.status === "active");
}

export async function submitDonation({ userId, organization, amount, message = "", idempotencyKey }) {
  if (!organization?.id || organization.status !== "active") throw new Error("Choose an active fictional demo organization.");
  const numericAmount = validateAmount(amount);
  const cleanMessage = validateMessage(message);

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("service_payment", {
      p_amount: numericAmount,
      p_transaction_type: "donation",
      p_reference: organization.name,
      p_metadata: {
        channel: "donation_simulation",
        service_type: "donation",
        organization_id: organization.id,
        organization_name: organization.name,
        organization_description: organization.description || "",
        message: cleanMessage,
        simulation_only: true,
        educational_demo: true,
        notice: "All organizations are fictional demo entities."
      },
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
    amount: numericAmount,
    type: "donation",
    reference: organization.name,
    metadata: {
      channel: "local_donation_simulation",
      service_type: "donation",
      organization_id: organization.id,
      organization_name: organization.name,
      organization_description: organization.description || "",
      message: cleanMessage,
      simulation_only: true,
      educational_demo: true,
      notice: "All organizations are fictional demo entities."
    },
    idempotencyKey
  });
}
