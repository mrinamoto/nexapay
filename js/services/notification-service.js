import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function normalizeNotification(item) {
  return {
    ...item,
    is_read: Boolean(item.is_read)
  };
}

function mirrorNotifications(userId, rows) {
  const state = getState();
  const ids = new Set(rows.map((item) => item.id));
  state.notifications = state.notifications
    .filter((item) => item.user_id !== userId || ids.has(item.id))
    .map((item) => rows.find((row) => row.id === item.id) || item);
  rows.forEach((row) => {
    if (!state.notifications.some((item) => item.id === row.id)) state.notifications.push(row);
  });
  saveState(state);
}

export function unreadCount(notifications = []) {
  return notifications.filter((item) => !item.is_read).length;
}

export function splitByRead(notifications = []) {
  return {
    unread: notifications.filter((item) => !item.is_read),
    read: notifications.filter((item) => item.is_read)
  };
}

export async function listNotifications(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = (data || []).map(normalizeNotification);
    mirrorNotifications(userId, rows);
    return rows;
  }

  return Wallet.listNotifications(userId).map(normalizeNotification);
}

export async function markNotification(id, userId, read = true) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: read })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id, user_id, title, message, type, is_read, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeNotification(data);
  }

  return Wallet.markNotification(id, userId, read);
}

export async function markAllNotifications(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return;
  }

  return Wallet.markAllNotifications(userId);
}

export async function deleteNotification(id, userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  return Wallet.deleteNotification(id, userId);
}
