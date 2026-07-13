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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRejects(fn, message) {
  let rejected = false;
  try {
    await fn();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

const adminProfile = Auth.startDemoSession("admin");

assert(adminProfile.role === "admin", "Demo admin session should use an admin profile.");
assert(Auth.requireRole(["admin"]).ok, "Admin route protection should allow an admin.");
assert(!Auth.requireRole(["agent"]).ok, "Admin route protection should block agent-only pages.");
assert(Admin.managedTableKeys().includes("bill_providers"), "Admin service should expose managed content tables.");

let data = await Admin.loadAdminData();
let stats = Admin.analytics(data);

assert(stats.totalUsers >= 9, "Admin analytics should count demo users.");
assert(stats.activeUsers >= 8, "Admin analytics should count active users.");
assert(stats.customers >= 4, "Admin analytics should count customers.");
assert(stats.merchants >= 2, "Admin analytics should count merchants.");
assert(stats.agents >= 2, "Admin analytics should count agents.");
assert(stats.totalTransactions >= 8, "Admin analytics should count transactions.");
assert(stats.totalVolume > 0, "Admin analytics should calculate simulated volume.");
assert(stats.daily.length === 7, "Admin analytics should return seven chart points.");

await assertRejects(
  () => Admin.setAccountStatus(adminProfile.id, adminProfile.id, "suspended"),
  "Admins should not be able to suspend their own active admin account."
);

const suspendedUser = await Admin.setAccountStatus(adminProfile.id, "usr_customer_nova", "suspended");
assert(suspendedUser.account_status === "suspended", "Admin should be able to suspend a demo user.");
const reactivatedUser = await Admin.setAccountStatus(adminProfile.id, "usr_customer_nova", "active");
assert(reactivatedUser.account_status === "active", "Admin should be able to reactivate a demo user.");

const suspendedMerchant = await Admin.setManagedStatus(adminProfile.id, "merchants", "mrc_lumen", "suspended");
assert(suspendedMerchant.status === "suspended", "Admin should be able to suspend a merchant.");
const activeMerchant = await Admin.setManagedStatus(adminProfile.id, "merchants", "mrc_lumen", "active");
assert(activeMerchant.status === "active", "Admin should be able to reactivate a merchant.");

const serviceCategory = await Admin.saveManagedItem(adminProfile.id, "service_categories", {
  name: "Cash Services Test",
  icon: "cash"
});
assert(serviceCategory.name === "Cash Services Test", "Admin should create service categories.");

const operator = await Admin.saveManagedItem(adminProfile.id, "recharge_operators", {
  name: "Sky Demo Mobile",
  logo_url: ""
});
assert(operator.name === "Sky Demo Mobile", "Admin should create recharge operators.");

const provider = await Admin.saveManagedItem(adminProfile.id, "bill_providers", {
  category_id: "cat_internet",
  name: "CloudLink Demo Fiber",
  logo_url: ""
});
assert(provider.name === "CloudLink Demo Fiber", "Admin should create bill providers.");

const bank = await Admin.saveManagedItem(adminProfile.id, "banks", {
  name: "Crescent Demo Bank"
});
assert(bank.name === "Crescent Demo Bank", "Admin should create demo banks.");

const donation = await Admin.saveManagedItem(adminProfile.id, "donation_organizations", {
  name: "Bright Futures Demo Trust",
  description: "Fictional test organization"
});
assert(donation.name === "Bright Futures Demo Trust", "Admin should create donation organizations.");

const promotion = await Admin.savePromotion(adminProfile.id, {
  title: "Admin Demo Promo",
  description: "Created by Phase 17 smoke test.",
  link: "pages/customer/payment.html",
  status: "active",
  start_date: "2026-01-01",
  end_date: "2026-12-31"
});
assert(promotion.status === "active", "Admin should create promotional banners.");

const announcement = await Admin.createAnnouncement(adminProfile.id, {
  title: "Phase 17 Announcement",
  message: "This is a safe in-app demo announcement.",
  targetRole: "customer"
});
assert(announcement.count >= 4, "Admin announcement should target active customers.");

const setting = await Admin.updateSystemSetting(adminProfile.id, "starting_demo_balance", { amount: 30000 });
assert(setting.value.amount === 30000, "Admin should update system settings.");

data = await Admin.loadAdminData();
stats = Admin.analytics(data);

assert(data.service_categories.some((item) => item.name === "Cash Services Test"), "Created service category should persist locally.");
assert(data.recharge_operators.some((item) => item.name === "Sky Demo Mobile"), "Created operator should persist locally.");
assert(data.bill_providers.some((item) => item.name === "CloudLink Demo Fiber"), "Created bill provider should persist locally.");
assert(data.banks.some((item) => item.name === "Crescent Demo Bank"), "Created bank should persist locally.");
assert(data.donation_organizations.some((item) => item.name === "Bright Futures Demo Trust"), "Created donation organization should persist locally.");
assert(data.promotions.some((item) => item.title === "Admin Demo Promo"), "Created promotion should persist locally.");
assert(data.notifications.some((item) => item.title === "Phase 17 Announcement" && item.type === "admin_announcement"), "Announcement notifications should persist locally.");
assert(stats.serviceItems >= 1, "Admin analytics should include managed service items.");

const auditActions = data.audit_logs.map((log) => log.action);
assert(auditActions.includes("admin_set_account_status"), "Account status changes should create audit logs.");
assert(auditActions.includes("admin_set_managed_status"), "Managed status changes should create audit logs.");
assert(auditActions.includes("admin_create_content"), "Managed content creation should create audit logs.");
assert(auditActions.includes("admin_create_promotion"), "Promotion creation should create audit logs.");
assert(auditActions.includes("admin_create_announcement"), "Announcement creation should create audit logs.");
assert(auditActions.includes("admin_update_system_setting"), "System setting updates should create audit logs.");

console.log("Phase 17 smoke test passed: admin analytics, role protection, account controls, service management, promotions, announcements, settings, and audit logs are correct.");
