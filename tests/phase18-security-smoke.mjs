import { readFile } from "node:fs/promises";

const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  }
};

const Auth = await import("../js/auth/auth-service.js");
const Admin = await import("../js/services/admin-service.js");
const { sanitizeDemoAssetUrl } = await import("../js/utils/security.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, message) {
  assert(text.includes(needle), message);
}

function assertNotIncludes(text, needle, message) {
  assert(!text.includes(needle), message);
}

function assertThrows(fn, message) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  assert(thrown, message);
}

const rls = await readFile(new URL("../supabase/migrations/003_rls_policies.sql", import.meta.url), "utf8");
const rpc = await readFile(new URL("../supabase/migrations/002_rpc_functions.sql", import.meta.url), "utf8");
const config = await readFile(new URL("../js/config/supabase.js", import.meta.url), "utf8");
const adminService = await readFile(new URL("../js/services/admin-service.js", import.meta.url), "utf8");
const contactService = await readFile(new URL("../js/services/contact-service.js", import.meta.url), "utf8");

[
  "system_settings",
  "profiles",
  "wallets",
  "transactions",
  "money_requests",
  "favorites",
  "merchants",
  "agents",
  "service_categories",
  "recharge_operators",
  "bill_categories",
  "bill_providers",
  "banks",
  "donation_organizations",
  "savings_goals",
  "savings_goal_entries",
  "notifications",
  "promotions",
  "audit_logs"
].forEach((table) => {
  assertIncludes(rls, `alter table public.${table} enable row level security;`, `${table} should have RLS enabled.`);
});

assertIncludes(rls, "drop policy if exists", "RLS migration should be rerunnable.");
assertIncludes(rls, "revoke all on all tables in schema public from anon;", "Anon table access should be revoked.");
assertIncludes(rls, "Users view own wallet", "Users should only read their own wallet.");
assertIncludes(rls, "Admins read wallets", "Admins should read wallets through admin-only policy.");
assertNotIncludes(rls, "on public.wallets for update", "Wallet updates must not be allowed directly by RLS.");
assertNotIncludes(rls, "on public.wallets for insert", "Wallet inserts must not be allowed directly by RLS.");
assertNotIncludes(rls, "on public.transactions for insert", "Transaction inserts must not be allowed directly by RLS.");
assertNotIncludes(rls, "on public.transactions for update", "Transaction updates must not be allowed directly by RLS.");
assertNotIncludes(rls, "on public.transactions for delete", "Transaction deletes must not be allowed directly by RLS.");
assertNotIncludes(rls, "on public.money_requests for insert", "Money requests should be created by RPC, not direct insert.");
assertNotIncludes(rls, "for all", "Phase 18 RLS should avoid broad direct table-management policies.");
assertIncludes(rls, "protect_merchant_sensitive_fields", "Merchant sensitive fields should be protected by trigger.");
assertIncludes(rls, "protect_notification_content_fields", "Notification content should be protected by trigger.");
assertIncludes(rls, "profile-images", "Profile image storage bucket policy should exist.");
assertIncludes(rls, "merchant-logos", "Merchant logo storage bucket policy should exist.");
assertIncludes(rls, "storage.foldername(name)", "Storage policies should isolate upload folders.");

assertIncludes(rpc, "admin_save_managed_item", "Admin content saves should use audited RPC.");
assertIncludes(rpc, "admin_save_promotion", "Promotion saves should use audited RPC.");
assertIncludes(rpc, "admin_create_content", "Content creation should be audited.");
assertIncludes(rpc, "admin_update_promotion", "Promotion updates should be audited.");
assertIncludes(rpc, "grant execute on function public.admin_save_managed_item", "Audited content RPC should be granted to authenticated users.");
assertIncludes(rpc, "grant execute on function public.admin_save_promotion", "Audited promotion RPC should be granted to authenticated users.");

assertIncludes(adminService, 'supabase.rpc("admin_save_managed_item"', "Admin service should call audited managed-item RPC.");
assertIncludes(adminService, 'supabase.rpc("admin_save_promotion"', "Admin service should call audited promotion RPC.");
assertNotIncludes(adminService, "supabase.from(table).insert", "Admin service should not directly insert managed content.");
assertNotIncludes(adminService, "supabase.from(table).update", "Admin service should not directly update managed content.");
assertIncludes(contactService, "ignoreDuplicates: true", "Favorites should avoid direct update permission during duplicate inserts.");

assertIncludes(config, "YOUR-PROJECT-REF", "Supabase config should keep placeholder URL in the repository.");
assertIncludes(config, "YOUR_PUBLIC_ANON_KEY", "Supabase config should keep placeholder anon key in the repository.");
assertNotIncludes(config.toLowerCase(), "service_role", "Frontend config must not contain a service-role key.");

assert(sanitizeDemoAssetUrl("") === "", "Blank asset URL should be allowed.");
assert(sanitizeDemoAssetUrl("assets/images/demo.png") === "assets/images/demo.png", "Project asset paths should be allowed.");
assert(sanitizeDemoAssetUrl("https://example.test/avatar.png").startsWith("https://"), "HTTPS image URLs should be allowed.");
assertThrows(() => sanitizeDemoAssetUrl("http://example.test/avatar.png"), "HTTP image URLs should be rejected.");
assertThrows(() => sanitizeDemoAssetUrl("javascript:alert(1)"), "JavaScript URLs should be rejected.");
assertThrows(() => sanitizeDemoAssetUrl("data:image/svg+xml;base64,PHN2Zy8+"), "Data URLs should be rejected.");

await Auth.signUp({
  fullName: "Security Demo User",
  email: "security-demo@nexapay.test",
  phone: "01710000999",
  password: "SecureDemo123",
  confirmPassword: "SecureDemo123"
});
Auth.startDemoSession("admin");
const data = await Admin.loadAdminData();
const signedUpProfile = data.profiles.find((profile) => profile.email === "security-demo@nexapay.test");

assert(signedUpProfile, "Security smoke test profile should exist in admin-loaded demo data.");
assert(!("password_hash" in signedUpProfile), "Admin-loaded local profiles should not expose password hashes.");
assert(!("password_salt" in signedUpProfile), "Admin-loaded local profiles should not expose password salts.");

console.log("Phase 18 security smoke test passed: RLS, audited admin RPCs, storage policies, asset URL validation, and sensitive local data scrubbing are correct.");
