import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import * as Auth from "../auth/auth-service.js";
import { getState, saveState, resetState } from "./storage.js";

const MANAGED_TABLES = {
  service_categories: {
    label: "Service category",
    idPrefix: "svc",
    fields: ["name", "icon", "status"]
  },
  recharge_operators: {
    label: "Recharge operator",
    idPrefix: "opr",
    fields: ["name", "logo_url", "status"]
  },
  bill_categories: {
    label: "Bill category",
    idPrefix: "cat",
    fields: ["name", "icon", "status"]
  },
  bill_providers: {
    label: "Bill provider",
    idPrefix: "bp",
    fields: ["category_id", "name", "logo_url", "status"]
  },
  banks: {
    label: "Demo bank",
    idPrefix: "bnk",
    fields: ["name", "status"]
  },
  donation_organizations: {
    label: "Donation organization",
    idPrefix: "don",
    fields: ["name", "description", "status"]
  }
};

function isSupabaseSession() {
  return isSupabaseConfigured() && Auth.getSession()?.provider === "supabase";
}

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function upsertSetting(list, row) {
  const index = list.findIndex((item) => item.key === row.key);
  if (index >= 0) list[index] = { ...list[index], ...row };
  else list.push(row);
}

function ensureAdminState(state) {
  state.system_settings ||= [
    { key: "starting_demo_balance", value: { amount: 25000 }, updated_at: now() },
    { key: "max_demo_transaction_amount", value: { amount: 100000 }, updated_at: now() }
  ];
  state.service_categories ||= [];
  state.recharge_operators ||= [];
  state.bill_categories ||= [];
  state.bill_providers ||= [];
  state.banks ||= [];
  state.donation_organizations ||= [];
  state.promotions ||= [];
  state.notifications ||= [];
  state.audit_logs ||= [];
  return state;
}

function auditLocal(state, actorId, action, entityType, entityId, metadata = {}) {
  state.audit_logs.push({
    id: makeId("aud"),
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: String(entityId),
    metadata,
    created_at: now()
  });
}

function localData() {
  const state = ensureAdminState(getState());
  saveState(state);
  const data = clone(state);
  data.profiles = data.profiles.map(({ password_hash, password_salt, ...profile }) => profile);
  return data;
}

async function fetchTable(supabase, table, columns = "*", order = null) {
  let query = supabase.from(table).select(columns);
  if (order) query = query.order(order.column, { ascending: order.ascending ?? true });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export function tableMeta(table) {
  return MANAGED_TABLES[table];
}

export function managedTableKeys() {
  return Object.keys(MANAGED_TABLES);
}

export async function loadAdminData() {
  if (!isSupabaseSession()) return localData();

  const supabase = await getSupabaseClient();
  const [
    profiles,
    wallets,
    transactions,
    moneyRequests,
    merchants,
    agents,
    serviceCategories,
    rechargeOperators,
    billCategories,
    billProviders,
    banks,
    donationOrganizations,
    promotions,
    notifications,
    auditLogs,
    systemSettings
  ] = await Promise.all([
    fetchTable(supabase, "profiles", "id, full_name, email, phone, avatar_url, role, account_status, created_at, updated_at", { column: "created_at", ascending: false }),
    fetchTable(supabase, "wallets", "id, user_id, balance, currency, status, created_at, updated_at"),
    fetchTable(supabase, "transactions", "id, transaction_id, transaction_type, sender_wallet_id, receiver_wallet_id, amount, fee, total_amount, status, reference, metadata, idempotency_key, created_at", { column: "created_at", ascending: false }),
    fetchTable(supabase, "money_requests", "*", { column: "created_at", ascending: false }),
    fetchTable(supabase, "merchants", "*", { column: "created_at", ascending: false }),
    fetchTable(supabase, "agents", "*", { column: "created_at", ascending: false }),
    fetchTable(supabase, "service_categories", "*"),
    fetchTable(supabase, "recharge_operators", "*"),
    fetchTable(supabase, "bill_categories", "*"),
    fetchTable(supabase, "bill_providers", "*"),
    fetchTable(supabase, "banks", "*"),
    fetchTable(supabase, "donation_organizations", "*"),
    fetchTable(supabase, "promotions", "*", { column: "start_date", ascending: false }),
    fetchTable(supabase, "notifications", "*", { column: "created_at", ascending: false }),
    fetchTable(supabase, "audit_logs", "*", { column: "created_at", ascending: false }),
    fetchTable(supabase, "system_settings", "*")
  ]);

  return ensureAdminState({
    profiles,
    wallets,
    transactions: transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount || 0),
      fee: Number(tx.fee || 0),
      total_amount: Number(tx.total_amount || 0),
      metadata: tx.metadata || {}
    })),
    money_requests: moneyRequests,
    merchants,
    agents,
    service_categories: serviceCategories,
    recharge_operators: rechargeOperators,
    bill_categories: billCategories,
    bill_providers: billProviders,
    banks,
    donation_organizations: donationOrganizations,
    promotions,
    notifications,
    audit_logs: auditLogs,
    system_settings: systemSettings
  });
}

export function profileById(data, id) {
  return data.profiles.find((profile) => profile.id === id);
}

export function walletByUser(data, userId) {
  return data.wallets.find((wallet) => wallet.user_id === userId);
}

export function userIdByWallet(data, walletId) {
  return data.wallets.find((wallet) => wallet.id === walletId)?.user_id || "";
}

export function analytics(data) {
  const today = new Date().toISOString().slice(0, 10);
  const users = data.profiles.filter((profile) => profile.role !== "system");
  const todayTransactions = data.transactions.filter((tx) => tx.created_at?.slice(0, 10) === today);
  const completedTransactions = data.transactions.filter((tx) => tx.status === "completed");
  const totalVolume = completedTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const moneyOut = completedTransactions
    .filter((tx) => tx.sender_wallet_id)
    .reduce((sum, tx) => sum + Number(tx.total_amount || tx.amount || 0), 0);
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const rows = completedTransactions.filter((tx) => tx.created_at?.slice(0, 10) === key);
    return {
      key,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      count: rows.length,
      volume: rows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    };
  });

  return {
    totalUsers: users.length,
    activeUsers: users.filter((profile) => profile.account_status === "active").length,
    suspendedUsers: users.filter((profile) => profile.account_status === "suspended").length,
    customers: users.filter((profile) => profile.role === "customer").length,
    merchants: data.merchants.length,
    agents: data.agents.length,
    totalTransactions: data.transactions.length,
    todayTransactions: todayTransactions.length,
    totalVolume,
    moneyIn: totalVolume,
    moneyOut,
    pendingTransactions: data.transactions.filter((tx) => tx.status === "pending").length,
    failedTransactions: data.transactions.filter((tx) => tx.status === "failed").length,
    activePromotions: data.promotions.filter((item) => item.status === "active").length,
    unreadNotifications: data.notifications.filter((item) => !item.is_read).length,
    serviceItems:
      data.service_categories.length +
      data.recharge_operators.length +
      data.bill_categories.length +
      data.bill_providers.length +
      data.banks.length +
      data.donation_organizations.length,
    daily,
    roleCounts: {
      customer: users.filter((profile) => profile.role === "customer").length,
      merchant: users.filter((profile) => profile.role === "merchant").length,
      agent: users.filter((profile) => profile.role === "agent").length,
      admin: users.filter((profile) => profile.role === "admin").length
    }
  };
}

export function textSearch(row, query) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return JSON.stringify(row).toLowerCase().includes(term);
}

export function filterProfiles(profiles, { query = "", role = "all", status = "all" } = {}) {
  return profiles
    .filter((profile) => profile.role !== "system")
    .filter((profile) => role === "all" || profile.role === role)
    .filter((profile) => status === "all" || profile.account_status === status)
    .filter((profile) => textSearch(profile, query));
}

export function filterTransactions(transactions, { query = "", type = "all", status = "all" } = {}) {
  return transactions
    .filter((tx) => type === "all" || tx.transaction_type === type)
    .filter((tx) => status === "all" || tx.status === status)
    .filter((tx) => textSearch(tx, query));
}

export async function setAccountStatus(actorId, profileId, status) {
  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_set_profile_status", {
      p_profile_id: profileId,
      p_status: status
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const state = ensureAdminState(getState());
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Profile was not found.");
  if (profileId === actorId && status === "suspended") throw new Error("Admins cannot suspend their own active admin account.");
  profile.account_status = status;
  profile.updated_at = now();
  auditLocal(state, actorId, "admin_set_account_status", "profiles", profileId, { status });
  saveState(state);
  return profile;
}

export async function setManagedStatus(actorId, table, id, status) {
  if (!MANAGED_TABLES[table] && !["merchants", "agents", "promotions"].includes(table)) {
    throw new Error("Unsupported managed table.");
  }

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_set_managed_status", {
      p_entity_type: table,
      p_entity_id: id,
      p_status: status
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const state = ensureAdminState(getState());
  const row = state[table]?.find((item) => item.id === id);
  if (!row) throw new Error("Managed record was not found.");
  row.status = status;
  auditLocal(state, actorId, "admin_set_managed_status", table, id, { status });
  saveState(state);
  return row;
}

function pickFields(fields, allowed) {
  return allowed.reduce((payload, field) => {
    if (fields[field] !== undefined) payload[field] = typeof fields[field] === "string" ? fields[field].trim() : fields[field];
    return payload;
  }, {});
}

export async function saveManagedItem(actorId, table, fields) {
  const meta = MANAGED_TABLES[table];
  if (!meta) throw new Error("Unsupported managed content type.");
  const payload = pickFields(fields, meta.fields);
  payload.status ||= "active";
  if (!payload.name || payload.name.length < 2) throw new Error(`${meta.label} name is required.`);
  if (table === "bill_providers" && !payload.category_id) throw new Error("Choose a bill category for this provider.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_save_managed_item", {
      p_entity_type: table,
      p_entity_id: fields.id || null,
      p_payload: payload
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const state = ensureAdminState(getState());
  if (fields.id) {
    const existing = state[table].find((item) => item.id === fields.id);
    if (!existing) throw new Error("Managed record was not found.");
    Object.assign(existing, payload);
    auditLocal(state, actorId, "admin_update_content", table, existing.id, payload);
    saveState(state);
    return existing;
  }

  const row = { id: makeId(meta.idPrefix), ...payload };
  state[table].push(row);
  auditLocal(state, actorId, "admin_create_content", table, row.id, payload);
  saveState(state);
  return row;
}

export async function savePromotion(actorId, fields) {
  const payload = pickFields(fields, ["title", "description", "image_url", "link", "status", "start_date", "end_date"]);
  payload.status ||= "active";
  if (!payload.title || payload.title.length < 2) throw new Error("Promotion title is required.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_save_promotion", {
      p_promotion_id: fields.id || null,
      p_payload: payload
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const state = ensureAdminState(getState());
  if (fields.id) {
    const existing = state.promotions.find((item) => item.id === fields.id);
    if (!existing) throw new Error("Promotion was not found.");
    Object.assign(existing, payload);
    auditLocal(state, actorId, "admin_update_promotion", "promotions", existing.id, payload);
    saveState(state);
    return existing;
  }

  const row = { id: makeId("prm"), ...payload };
  state.promotions.unshift(row);
  auditLocal(state, actorId, "admin_create_promotion", "promotions", row.id, payload);
  saveState(state);
  return row;
}

export async function createAnnouncement(actorId, { title, message, targetRole = "all" }) {
  const safeTitle = title.trim();
  const safeMessage = message.trim();
  if (safeTitle.length < 2) throw new Error("Announcement title is required.");
  if (safeMessage.length < 2) throw new Error("Announcement message is required.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_create_announcement", {
      p_title: safeTitle,
      p_message: safeMessage,
      p_target_role: targetRole === "all" ? null : targetRole
    });
    if (error) throw new Error(error.message);
    return { count: data };
  }

  const state = ensureAdminState(getState());
  const recipients = state.profiles.filter((profile) => (
    profile.account_status === "active" &&
    profile.role !== "system" &&
    (targetRole === "all" || profile.role === targetRole)
  ));
  recipients.forEach((profile) => {
    state.notifications.unshift({
      id: makeId("ntf"),
      user_id: profile.id,
      title: safeTitle,
      message: safeMessage,
      type: "admin_announcement",
      is_read: false,
      created_at: now()
    });
  });
  auditLocal(state, actorId, "admin_create_announcement", "notifications", targetRole, {
    title: safeTitle,
    target_role: targetRole,
    recipient_count: recipients.length
  });
  saveState(state);
  return { count: recipients.length };
}

export async function updateSystemSetting(actorId, key, value) {
  if (!key.trim()) throw new Error("Setting key is required.");

  if (isSupabaseSession()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("admin_update_system_setting", {
      p_key: key.trim(),
      p_value: value
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const state = ensureAdminState(getState());
  const row = { key: key.trim(), value, updated_at: now() };
  upsertSetting(state.system_settings, row);
  auditLocal(state, actorId, "admin_update_system_setting", "system_settings", row.key, { value });
  saveState(state);
  return row;
}

export function resetLocalDemoData(actorId) {
  resetState();
  const state = ensureAdminState(getState());
  auditLocal(state, actorId, "reset_demo_data", "system", "demo");
  saveState(state);
}
