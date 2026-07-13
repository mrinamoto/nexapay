import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState } from "./storage.js";
import * as Wallet from "./wallet-service.js";
import * as Transactions from "./transaction-service.js";

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function profileById(userId) {
  return getState().profiles.find((profile) => profile.id === userId);
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function mirrorProfiles(rows) {
  if (!rows.length) return;
  const state = getState();
  rows.forEach((row) => upsertById(state.profiles, row));
  saveState(state);
}

function normalizeProfile(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email || `hidden-${row.id}@nexapay.demo`,
    phone: row.phone,
    avatar_url: row.avatar_url || "",
    role: row.role || "customer",
    account_status: row.account_status || "active",
    created_at: row.created_at || now(),
    updated_at: row.updated_at || now()
  };
}

function normalizeFavorite(row) {
  const favorite = row.favorite || row.profiles || null;
  return {
    id: row.id,
    user_id: row.user_id,
    favorite_user_id: row.favorite_user_id,
    created_at: row.created_at,
    profile: favorite ? normalizeProfile(favorite) : profileById(row.favorite_user_id)
  };
}

function mirrorFavorites(userId, favorites) {
  const state = getState();
  state.favorites = state.favorites.filter((item) => item.user_id !== userId);
  favorites.forEach((favorite) => {
    state.favorites.push({
      id: favorite.id,
      user_id: favorite.user_id,
      favorite_user_id: favorite.favorite_user_id,
      created_at: favorite.created_at
    });
    if (favorite.profile) upsertById(state.profiles, favorite.profile);
  });
  saveState(state);
}

export function recentContactsFromTransactions(transactions, userId, limit = 8) {
  const map = new Map();
  transactions.forEach((tx) => {
    const otherId = tx.sender_id === userId ? tx.receiver_id : tx.receiver_id === userId ? tx.sender_id : null;
    if (!otherId || otherId === userId) return;
    const parties = Transactions.partiesFor(tx);
    const profile = profileById(otherId) || {
      id: otherId,
      full_name: tx.sender_id === userId ? parties.receiverName : parties.senderName,
      phone: tx.sender_id === userId ? parties.receiverPhone : parties.senderPhone,
      role: "customer",
      account_status: "active"
    };
    if (!profile || profile.role === "system") return;
    const existing = map.get(otherId) || {
      ...profile,
      count: 0,
      last_at: tx.created_at
    };
    existing.count += 1;
    if (new Date(tx.created_at) > new Date(existing.last_at)) existing.last_at = tx.created_at;
    map.set(otherId, existing);
  });

  return [...map.values()]
    .sort((a, b) => b.count - a.count || new Date(b.last_at) - new Date(a.last_at))
    .slice(0, limit);
}

export async function listFavorites(userId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("list_demo_favorites");
    if (error) throw new Error(error.message);
    const rows = (data || []).map((row) => normalizeFavorite({
      id: row.id,
      user_id: row.user_id,
      favorite_user_id: row.favorite_user_id,
      created_at: row.created_at,
      favorite: {
        id: row.favorite_user_id,
        full_name: row.favorite_name,
        phone: row.favorite_phone,
        role: row.favorite_role,
        account_status: "active"
      }
    }));
    mirrorFavorites(userId, rows);
    mirrorProfiles(rows.map((row) => row.profile).filter(Boolean));
    return rows;
  }

  const state = getState();
  return state.favorites
    .filter((favorite) => favorite.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((favorite) => ({ ...favorite, profile: profileById(favorite.favorite_user_id) }))
    .filter((favorite) => favorite.profile);
}

export async function searchContacts(query, userId, includeRoles = ["customer", "merchant", "agent"]) {
  const normalized = query.trim().toLowerCase();
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("search_demo_profiles", { p_query: normalized });
    if (error) throw new Error(error.message);
    const rows = (data || [])
      .filter((profile) => includeRoles.includes(profile.role))
      .map(normalizeProfile);
    mirrorProfiles(rows);
    return rows;
  }

  return Wallet.getContacts({ includeRoles, excludeUserId: userId })
    .filter((profile) => {
      if (!normalized) return true;
      return `${profile.full_name} ${profile.phone} ${profile.role}`.toLowerCase().includes(normalized);
    })
    .slice(0, 30);
}

export async function listRecentContacts(userId) {
  const transactions = await Transactions.listTransactions(userId);
  return recentContactsFromTransactions(transactions, userId);
}

export async function addFavorite(userId, favoriteUserId) {
  if (!favoriteUserId || favoriteUserId === userId) throw new Error("Choose a valid demo contact.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("favorites")
      .upsert(
        { user_id: userId, favorite_user_id: favoriteUserId },
        { onConflict: "user_id,favorite_user_id", ignoreDuplicates: true }
      );
    if (error) throw new Error(error.message);
    return listFavorites(userId);
  }

  const state = getState();
  if (!state.favorites.some((item) => item.user_id === userId && item.favorite_user_id === favoriteUserId)) {
    state.favorites.push({ id: makeId("fav"), user_id: userId, favorite_user_id: favoriteUserId, created_at: now() });
    saveState(state);
  }
  return listFavorites(userId);
}

export async function removeFavorite(userId, favoriteUserId) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("favorite_user_id", favoriteUserId);
    if (error) throw new Error(error.message);
    return listFavorites(userId);
  }

  const state = getState();
  state.favorites = state.favorites.filter((item) => !(item.user_id === userId && item.favorite_user_id === favoriteUserId));
  saveState(state);
  return listFavorites(userId);
}

export async function toggleFavorite(userId, favoriteUserId) {
  const favorites = await listFavorites(userId);
  const exists = favorites.some((item) => item.favorite_user_id === favoriteUserId);
  return exists ? removeFavorite(userId, favoriteUserId) : addFavorite(userId, favoriteUserId);
}
