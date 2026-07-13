import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const ADD_MONEY_AMOUNTS = [500, 1000, 2000, 5000];
export const ADD_MONEY_DAILY_LIMIT = 20000;
export const CASH_OUT_LIMITS = { min: 1, max: 100000 };

export const DEMO_FUNDING_SOURCES = [
  { id: "nova-bank", name: "Nova Bank Demo", type: "Demo bank" },
  { id: "horizon-bank", name: "Horizon Bank Demo", type: "Demo bank" },
  { id: "nexapay-card", name: "NexaPay Demo Card", type: "Demo card" },
  { id: "balance-faucet", name: "Demo Balance Faucet", type: "Demo faucet" }
];

function now() {
  return new Date().toISOString();
}

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function normalizeAgent(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    agent_code: row.agent_code,
    location: row.location,
    status: row.status || "active",
    profile: row.profile || {
      id: row.user_id,
      full_name: row.agent_name,
      phone: row.agent_phone || "",
      role: "agent",
      account_status: "active"
    },
    created_at: row.created_at || now()
  };
}

function mirrorAgent(agent) {
  if (!agent?.id || !agent?.user_id) return;
  const state = getState();
  upsertById(state.profiles, {
    id: agent.user_id,
    full_name: agent.profile?.full_name || "Registered Demo Agent",
    email: agent.profile?.email || `hidden-${agent.user_id}@nexapay.demo`,
    phone: agent.profile?.phone || `agent-${agent.agent_code}`,
    avatar_url: agent.profile?.avatar_url || "",
    role: "agent",
    account_status: "active",
    created_at: agent.profile?.created_at || agent.created_at || now(),
    updated_at: now()
  });
  upsertById(state.agents, {
    id: agent.id,
    user_id: agent.user_id,
    agent_code: agent.agent_code,
    location: agent.location,
    status: agent.status || "active",
    created_at: agent.created_at || now()
  });
  saveState(state);
}

function mirrorTransaction(tx) {
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
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

function normalizeTransaction(tx, { userId, agent = null, direction }) {
  const metadata = tx.metadata || {};
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: direction === "out" ? (metadata.sender_user_id || userId) : null,
    receiver_id: direction === "out" ? (metadata.receiver_user_id || agent?.user_id) : userId,
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

function validatePredefinedAmount(amount) {
  const numericAmount = Number(amount);
  if (!ADD_MONEY_AMOUNTS.includes(numericAmount)) throw new Error("Choose one of the predefined demo amounts.");
  return numericAmount;
}

function validateCashOutAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) throw new Error("Enter a valid demo cash-out amount.");
  if (numericAmount < CASH_OUT_LIMITS.min) throw new Error("The minimum cash out is 1 demo taka.");
  if (numericAmount > CASH_OUT_LIMITS.max) throw new Error("The maximum cash out is 100,000 demo taka.");
  if (Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) > 0.000001) {
    throw new Error("Use at most two decimal places.");
  }
  return numericAmount;
}

export function getFundingModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createFundingRequestId(kind, userId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${kind}:${userId}:${random}`;
}

export function calculateCashOutFee(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.round(numericAmount * 0.01 * 100) / 100;
}

export function getInitialAgents() {
  if (isSupabaseSession()) return [];
  return Wallet.getAgents().filter((agent) => agent.status === "active" && agent.profile?.account_status === "active");
}

export async function searchAgents(query = "") {
  const normalized = query.trim().toLowerCase();
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("search_demo_agents", { p_query: normalized });
    if (error) throw new Error(error.message);
    const agents = (data || []).map(normalizeAgent).filter(Boolean);
    agents.forEach(mirrorAgent);
    return agents;
  }

  return getInitialAgents().filter((agent) => {
    if (!normalized) return true;
    return `${agent.profile.full_name} ${agent.agent_code} ${agent.location}`.toLowerCase().includes(normalized);
  });
}

export async function addDemoMoney({ userId, amount, source, idempotencyKey }) {
  const numericAmount = validatePredefinedAmount(amount);
  if (!DEMO_FUNDING_SOURCES.some((item) => item.name === source)) {
    throw new Error("Choose a fictional NexaPay demo funding source.");
  }

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("add_demo_money", {
      p_amount: numericAmount,
      p_source: source,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    const tx = normalizeTransaction(data, { userId, direction: "in" });
    mirrorTransaction(tx);
    await refreshOwnWallet(userId);
    return tx;
  }

  return Wallet.addDemoMoney(userId, {
    amount: numericAmount,
    source,
    idempotencyKey
  });
}

export async function cashOut({ userId, agent, amount, idempotencyKey }) {
  const numericAmount = validateCashOutAmount(amount);
  if (!agent?.id || !agent?.user_id || agent.status !== "active") throw new Error("Choose an active registered demo agent.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("cash_out_demo_money", {
      p_agent_id: agent.id,
      p_amount: numericAmount,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    mirrorAgent(agent);
    const tx = normalizeTransaction(data, { userId, agent, direction: "out" });
    mirrorTransaction(tx);
    await refreshOwnWallet(userId);
    return tx;
  }

  return Wallet.cashOut({
    userId,
    agentId: agent.id,
    amount: numericAmount,
    idempotencyKey
  });
}
