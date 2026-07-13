import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase.js";
import { getState, saveState, getSession as getStoredSession, setSession, clearSession } from "../services/storage.js";
import { STARTING_DEMO_BALANCE } from "../services/demo-data.js";

const SUPABASE_PROFILE_RETRIES = 6;
const SUPABASE_PROFILE_RETRY_DELAY = 300;

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function validateEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDemoPhone(phone = "") {
  return /^[0-9+ -]{8,20}$/.test(phone.trim());
}

function validatePassword(password = "") {
  if (password.length < 8) throw new Error("Use at least 8 characters for this demo password.");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Use at least one letter and one number in this demo password.");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appUrl(fileName) {
  if (typeof window === "undefined") return undefined;
  return new URL(fileName, window.location.href).toString();
}

function upsertById(list, row) {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
  } else {
    list.push(row);
  }
}

function mirrorSupabaseProfile({ profile, wallet }) {
  const state = getState();
  const safeProfile = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    avatar_url: profile.avatar_url || "",
    role: profile.role || "customer",
    account_status: profile.account_status || "active",
    created_at: profile.created_at,
    updated_at: profile.updated_at || profile.created_at
  };
  const safeWallet = {
    id: wallet.id,
    user_id: wallet.user_id,
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || "BDT_DEMO",
    status: wallet.status || "active",
    created_at: wallet.created_at,
    updated_at: wallet.updated_at || wallet.created_at
  };

  upsertById(state.profiles, safeProfile);
  upsertById(state.wallets, safeWallet);
  saveState(state);
  setSession({ userId: safeProfile.id, provider: "supabase", createdAt: new Date().toISOString() });
  return safeProfile;
}

async function fetchSupabaseProfileWallet(userId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  let lastError = null;
  for (let attempt = 0; attempt < SUPABASE_PROFILE_RETRIES; attempt += 1) {
    const profileResult = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, role, account_status, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileResult.error) {
      lastError = profileResult.error;
      break;
    }

    const walletResult = await supabase
      .from("wallets")
      .select("id, user_id, balance, currency, status, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletResult.error) {
      lastError = walletResult.error;
      break;
    }

    if (profileResult.data && walletResult.data) {
      return mirrorSupabaseProfile({ profile: profileResult.data, wallet: walletResult.data });
    }

    await sleep(SUPABASE_PROFILE_RETRY_DELAY);
  }

  if (lastError) throw new Error(lastError.message);
  throw new Error("Your Supabase profile or demo wallet was not ready yet. Wait a moment, then refresh.");
}

export function isUsingSupabase() {
  return isSupabaseConfigured();
}

export function getAuthModeLabel() {
  return isUsingSupabase() ? "Supabase Auth" : "Local demo auth";
}

export function getSession() {
  return getStoredSession();
}

export function getCurrentProfile() {
  const session = getStoredSession();
  if (!session) return null;
  return getState().profiles.find((profile) => profile.id === session.userId) || null;
}

export async function initializeAuth() {
  const storedSession = getStoredSession();
  if (!isUsingSupabase()) return getCurrentProfile();

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  if (!data.session) {
    if (storedSession?.provider === "supabase") clearSession();
    return storedSession?.provider === "local-demo" ? getCurrentProfile() : null;
  }

  return fetchSupabaseProfileWallet(data.session.user.id);
}

export async function signUp({ fullName, email, phone, password, confirmPassword }) {
  if (!fullName || !email || !phone || !password) throw new Error("Please fill in every required field.");
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail)) throw new Error("Enter a valid demo email address.");
  if (!validateDemoPhone(phone)) throw new Error("Enter a valid demo phone number.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");
  validatePassword(password);

  if (isUsingSupabase()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim()
        },
        emailRedirectTo: appUrl("login.html")
      }
    });

    if (error) throw new Error(error.message);
    if (!data.session) {
      return {
        needsEmailConfirmation: true,
        email: normalizedEmail,
        message: "Supabase created the Auth user. If email confirmation is enabled, open the confirmation email before logging in."
      };
    }

    const profile = await fetchSupabaseProfileWallet(data.user.id);
    return { profile, message: "Supabase signup complete. Your demo profile and wallet were created automatically." };
  }

  const state = getState();
  if (state.profiles.some((profile) => profile.email.toLowerCase() === normalizedEmail)) {
    throw new Error("That demo email is already registered.");
  }

  const userId = makeId("usr_customer");
  const createdAt = new Date().toISOString();
  const salt = crypto.randomUUID();
  const password_hash = await sha256(`${salt}:${password}`);

  state.profiles.push({
    id: userId,
    full_name: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    role: "customer",
    account_status: "active",
    avatar_url: "",
    password_salt: salt,
    password_hash,
    created_at: createdAt,
    updated_at: createdAt
  });

  state.wallets.push({
    id: makeId("wlt"),
    user_id: userId,
    balance: STARTING_DEMO_BALANCE,
    currency: "BDT_DEMO",
    status: "active",
    created_at: createdAt,
    updated_at: createdAt
  });

  state.notifications.push({
    id: makeId("ntf"),
    user_id: userId,
    title: "Welcome to NexaPay",
    message: "Your educational demo wallet has been created with a configurable starting demo balance.",
    type: "admin_announcement",
    is_read: false,
    created_at: createdAt
  });

  saveState(state);
  setSession({ userId, provider: "local-demo", createdAt });
  return { profile: getCurrentProfile(), message: "Local demo signup complete. Your fake balance is ready." };
}

export async function signIn({ email, password }) {
  if (!email || !password) throw new Error("Enter your demo email and password.");

  if (isUsingSupabase()) {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Supabase did not return a session. Check whether email confirmation is required.");

    return fetchSupabaseProfileWallet(data.user.id);
  }

  const state = getState();
  const profile = state.profiles.find((item) => item.email.toLowerCase() === normalizeEmail(email));
  if (!profile || !profile.password_hash || !profile.password_salt) {
    throw new Error("Use a demo role button, or sign up to create a local demo login.");
  }

  const hash = await sha256(`${profile.password_salt}:${password}`);
  if (hash !== profile.password_hash) throw new Error("The demo email or password is incorrect.");
  if (profile.account_status !== "active") throw new Error("This demo account is not active.");

  setSession({ userId: profile.id, provider: "local-demo", createdAt: new Date().toISOString() });
  return profile;
}

export async function signOut() {
  if (isUsingSupabase()) {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
  }
  clearSession();
}

export async function requestDemoPasswordReset(email) {
  if (!email || !validateEmail(normalizeEmail(email))) throw new Error("Enter a valid demo email address.");
  const normalizedEmail = normalizeEmail(email);

  if (isUsingSupabase()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: appUrl("reset-password.html")
    });
    if (error) throw new Error(error.message);
    return {
      email: normalizedEmail,
      message: "Supabase password recovery was requested. Check the demo email inbox configured for your Supabase project."
    };
  }

  localStorage.setItem("nexapay.demo.reset.email", normalizedEmail);
  return {
    email: normalizedEmail,
    message: "Demo reset is ready. No email or OTP was sent."
  };
}

export async function resetDemoPassword({ email, password, confirmPassword }) {
  const normalizedEmail = normalizeEmail(email);
  if (!validateEmail(normalizedEmail)) throw new Error("Enter a valid demo email address.");
  if (password !== confirmPassword) throw new Error("Passwords do not match.");
  validatePassword(password);

  if (isUsingSupabase()) {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(`${error.message} Open the latest Supabase recovery link, then try again.`);
    return {
      email: normalizedEmail,
      message: "Your Supabase demo password has been updated."
    };
  }

  const state = getState();
  const profile = state.profiles.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (profile?.password_hash && profile?.password_salt) {
    const salt = crypto.randomUUID();
    profile.password_salt = salt;
    profile.password_hash = await sha256(`${salt}:${password}`);
    profile.updated_at = new Date().toISOString();
    saveState(state);
  }

  localStorage.removeItem("nexapay.demo.reset.email");
  return {
    email: normalizedEmail,
    message: "If this local demo account exists, its demo password has been updated."
  };
}

export function startDemoSession(role = "customer") {
  const state = getState();
  const profile = state.profiles.find((item) => item.role === role && item.account_status === "active");
  if (!profile) throw new Error(`No active ${role} demo profile found.`);
  setSession({ userId: profile.id, provider: "local-demo", createdAt: new Date().toISOString(), demoRole: role });
  return profile;
}

export function requireRole(allowedRoles = []) {
  const profile = getCurrentProfile();
  if (!profile) return { ok: false, reason: "missing_session" };
  if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
    return { ok: false, reason: "wrong_role", profile };
  }
  return { ok: true, profile };
}
