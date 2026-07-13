import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

export const SAVINGS_LIMITS = {
  targetMax: 1000000,
  moveMin: 1,
  moveMax: 100000
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

function mirrorGoal(goal) {
  const state = getState();
  state.savings_goals ||= [];
  upsertById(state.savings_goals, normalizeGoal(goal));
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

function mirrorTransaction(tx) {
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== tx.id && item.transaction_id !== tx.transaction_id);
  state.transactions.unshift(tx);
  saveState(state);
}

function normalizeGoal(goal, entries = []) {
  return {
    ...goal,
    target_amount: Number(goal.target_amount || 0),
    current_amount: Number(goal.current_amount || 0),
    entries: entries.map(normalizeEntry)
  };
}

function normalizeEntry(entry) {
  return {
    ...entry,
    amount: Number(entry.amount || 0)
  };
}

function normalizeTransaction(tx, userId) {
  const metadata = tx.metadata || {};
  const isWithdrawal = tx.transaction_type === "savings_withdrawal";
  return {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: isWithdrawal ? null : (metadata.sender_user_id || userId),
    receiver_id: isWithdrawal ? (metadata.receiver_user_id || userId) : null,
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

function validateGoalInput({ title, targetAmount, targetDate }) {
  const cleanTitle = (title || "").trim();
  const amount = Number(targetAmount);
  if (cleanTitle.length < 2 || cleanTitle.length > 120) throw new Error("Savings title must be 2 to 120 characters.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid target amount.");
  if (amount > SAVINGS_LIMITS.targetMax) throw new Error("The maximum demo savings target is 1,000,000.");
  if (!targetDate) throw new Error("Choose a target date.");
  return { title: cleanTitle, targetAmount: Number(amount.toFixed(2)), targetDate };
}

function validateMoveInput({ amount, direction }) {
  const numericAmount = Number(amount);
  if (!["deposit", "withdrawal", "withdraw"].includes(direction)) throw new Error("Choose deposit or withdrawal.");
  if (!Number.isFinite(numericAmount) || numericAmount < SAVINGS_LIMITS.moveMin) throw new Error("Enter a savings amount greater than zero.");
  if (numericAmount > SAVINGS_LIMITS.moveMax) throw new Error("The maximum demo savings movement is 100,000.");
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) throw new Error("Use at most two decimal places.");
  return Number(numericAmount.toFixed(2));
}

export function createSavingsRequestId(kind, userId) {
  return `savings:${kind}:${userId}:${randomId()}`;
}

export function getSavingsModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export async function listSavingsGoals(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data: goals, error } = await supabase
      .from("savings_goals")
      .select("id, user_id, title, target_amount, current_amount, target_date, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const goalIds = (goals || []).map((goal) => goal.id);
    let entries = [];
    if (goalIds.length) {
      const result = await supabase
        .from("savings_goal_entries")
        .select("id, goal_id, transaction_id, entry_type, amount, note, created_at")
        .in("goal_id", goalIds)
        .order("created_at", { ascending: false });
      if (result.error) throw new Error(result.error.message);
      entries = result.data || [];
    }

    return (goals || []).map((goal) => normalizeGoal(goal, entries.filter((entry) => entry.goal_id === goal.id)));
  }

  const state = getState();
  state.savings_goal_entries ||= [];
  return state.savings_goals
    .filter((goal) => goal.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((goal) => normalizeGoal(goal, state.savings_goal_entries.filter((entry) => entry.goal_id === goal.id)));
}

export async function createSavingsGoal(userId, input) {
  const clean = validateGoalInput(input);

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("create_savings_goal", {
      p_title: clean.title,
      p_target_amount: clean.targetAmount,
      p_target_date: clean.targetDate
    });
    if (error) throw new Error(error.message);
    const goal = normalizeGoal(data);
    mirrorGoal(goal);
    return goal;
  }

  return Wallet.createSavingsGoal(userId, clean);
}

export async function moveSavingsMoney({ userId, goal, amount, direction, note = "", idempotencyKey }) {
  if (!goal?.id) throw new Error("Choose a savings goal.");
  const normalizedDirection = direction === "withdraw" ? "withdrawal" : direction;
  const numericAmount = validateMoveInput({ amount, direction: normalizedDirection });

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("move_savings_goal_money", {
      p_goal_id: goal.id,
      p_amount: numericAmount,
      p_direction: normalizedDirection,
      p_note: note || null,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);
    const tx = normalizeTransaction(data, userId);
    mirrorTransaction(tx);
    await refreshOwnWallet(userId);
    return { transaction: tx };
  }

  return Wallet.moveSavings({
    userId,
    goalId: goal.id,
    amount: numericAmount,
    direction: normalizedDirection === "withdrawal" ? "withdraw" : "deposit",
    note,
    idempotencyKey
  });
}
