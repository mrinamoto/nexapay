import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";
import { searchRecipients } from "./send-money-service.js";

export const REQUEST_LIMITS = {
  min: 1,
  max: 100000
};

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function now() {
  return new Date().toISOString();
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
  } else {
    list.push(row);
  }
}

function mirrorProfile(profile) {
  if (!profile?.id) return;
  const state = getState();
  upsertById(state.profiles, {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email || `hidden-${profile.id}@nexapay.demo`,
    phone: profile.phone,
    avatar_url: profile.avatar_url || "",
    role: profile.role || "customer",
    account_status: "active",
    created_at: profile.created_at || now(),
    updated_at: now()
  });
  saveState(state);
}

function normalizeAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) throw new Error("Enter a valid request amount.");
  if (numericAmount < REQUEST_LIMITS.min) throw new Error("The minimum request amount is 1 demo taka.");
  if (numericAmount > REQUEST_LIMITS.max) throw new Error("The maximum request amount is 100,000 demo taka.");
  const cents = numericAmount * 100;
  if (Math.abs(cents - Math.round(cents)) > 0.000001) {
    throw new Error("Use at most two decimal places.");
  }
  return numericAmount;
}

function normalizeRequest(row) {
  return {
    id: row.id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    amount: Number(row.amount || 0),
    note: row.note || "",
    status: row.status,
    idempotency_key: row.idempotency_key || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    sender: row.sender || {
      id: row.sender_id,
      full_name: row.sender_name || "Demo requester",
      phone: row.sender_phone || "",
      role: "customer"
    },
    receiver: row.receiver || {
      id: row.receiver_id,
      full_name: row.receiver_name || "Demo receiver",
      phone: row.receiver_phone || "",
      role: "customer"
    }
  };
}

function mirrorRequest(request) {
  const state = getState();
  state.money_requests = state.money_requests.filter((item) => item.id !== request.id);
  state.money_requests.unshift({
    id: request.id,
    sender_id: request.sender_id,
    receiver_id: request.receiver_id,
    amount: request.amount,
    note: request.note,
    status: request.status,
    idempotency_key: request.idempotency_key,
    created_at: request.created_at,
    updated_at: request.updated_at
  });
  saveState(state);
}

function mirrorTransaction(tx, currentUserId, request) {
  if (!tx?.id) return null;
  const metadata = tx.metadata || {};
  const normalized = {
    ...tx,
    amount: Number(tx.amount || 0),
    fee: Number(tx.fee || 0),
    total_amount: Number(tx.total_amount || 0),
    sender_id: metadata.sender_user_id || currentUserId,
    receiver_id: metadata.receiver_user_id || request.sender_id,
    metadata
  };
  const state = getState();
  state.transactions = state.transactions.filter((item) => item.id !== normalized.id && item.transaction_id !== normalized.transaction_id);
  state.transactions.unshift(normalized);
  saveState(state);
  return normalized;
}

export function getRequestModeLabel() {
  return isSupabaseSession() ? "Supabase RPC" : "Local demo service";
}

export function createMoneyRequestId(senderId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `money-request:${senderId}:${random}`;
}

export function createResponseRequestId(requestId, actorId) {
  const random = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `request-response:${requestId}:${actorId}:${random}`;
}

export function personalQrValue(profile) {
  return `NEXAPAY:USER:${profile.phone}`;
}

export function internalPaymentLink(profile, rootHref) {
  return rootHref(`pages/customer/send-money.html?to=${encodeURIComponent(profile.phone)}`);
}

export function getInitialRequestContacts(currentUserId) {
  if (isSupabaseSession()) return [];
  return Wallet.getContacts({ includeRoles: ["customer"], excludeUserId: currentUserId });
}

export async function searchRequestContacts(query, currentUserId) {
  return searchRecipients(query, currentUserId);
}

export async function listMoneyRequests(currentUserId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("list_demo_money_requests");
    if (error) throw new Error(error.message);
    return (data || []).map(normalizeRequest);
  }

  return Wallet.getIncomingRequests(currentUserId).map(normalizeRequest);
}

export async function createMoneyRequest({ senderId, receiver, amount, note, idempotencyKey }) {
  const numericAmount = normalizeAmount(amount);
  if (!receiver?.id) throw new Error("Choose a registered demo user.");
  if (receiver.id === senderId) throw new Error("You cannot request demo money from yourself.");
  if ((note || "").trim().length > 240) throw new Error("Request note is too long.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("create_demo_money_request", {
      p_receiver_user_id: receiver.id,
      p_amount: numericAmount,
      p_note: note || null,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);

    mirrorProfile(receiver);
    const current = Auth.getCurrentProfile();
    const request = normalizeRequest({
      ...data,
      sender_name: current?.full_name,
      sender_phone: current?.phone,
      receiver_name: receiver.full_name,
      receiver_phone: receiver.phone
    });
    mirrorRequest(request);
    return request;
  }

  const request = Wallet.createMoneyRequest({
    senderId,
    receiverId: receiver.id,
    amount: numericAmount,
    note,
    idempotencyKey
  });
  return normalizeRequest({
    ...request,
    sender: getState().profiles.find((profile) => profile.id === request.sender_id),
    receiver: getState().profiles.find((profile) => profile.id === request.receiver_id)
  });
}

export async function respondToMoneyRequest({ request, actorId, response, idempotencyKey }) {
  if (!request?.id) throw new Error("Money request was not found.");
  if (!["accepted", "declined"].includes(response)) throw new Error("Choose accept or decline.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("respond_money_request", {
      p_request_id: request.id,
      p_accept: response === "accepted",
      p_idempotency_key: idempotencyKey
    });
    if (error) throw new Error(error.message);

    const updated = { ...request, status: response, updated_at: now() };
    mirrorRequest(updated);
    const transaction = response === "accepted" ? mirrorTransaction(data, actorId, request) : null;
    return { request: updated, transaction };
  }

  return Wallet.respondToMoneyRequest({ requestId: request.id, actorId, response });
}

export async function cancelMoneyRequest({ request, actorId }) {
  if (!request?.id) throw new Error("Money request was not found.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("cancel_demo_money_request", {
      p_request_id: request.id
    });
    if (error) throw new Error(error.message);
    const updated = normalizeRequest({
      ...data,
      sender_name: request.sender?.full_name,
      sender_phone: request.sender?.phone,
      receiver_name: request.receiver?.full_name,
      receiver_phone: request.receiver?.phone
    });
    mirrorRequest(updated);
    return updated;
  }

  return Wallet.cancelMoneyRequest({ requestId: request.id, actorId });
}
