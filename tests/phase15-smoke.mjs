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
const Merchant = await import("../js/services/merchant-service.js");
const Wallet = await import("../js/services/wallet-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const merchantProfile = Auth.startDemoSession("merchant");
assert(merchantProfile.role === "merchant", "Demo merchant session should use a merchant profile.");
assert(Auth.requireRole(["merchant"]).ok, "Merchant role should pass merchant route protection.");
assert(!Auth.requireRole(["customer"]).ok, "Merchant role should not pass customer-only route protection.");

const userId = merchantProfile.id;
const dashboard = await Merchant.getMerchantDashboard(userId);

assert(dashboard.merchant.business_name === "Orion Mart", "Merchant dashboard should load the linked business.");
assert(dashboard.wallet.balance > 0, "Merchant dashboard should include demo balance.");
assert(dashboard.payments.length >= 1, "Merchant dashboard should include received payments.");
assert(dashboard.summary.totalAmount >= 850, "Merchant statistics should sum received merchant payments.");
assert(dashboard.summary.averageAmount > 0, "Merchant statistics should calculate average payment.");
assert(dashboard.summary.lastSevenDays.length === 7, "Merchant analytics should include seven chart points.");

const qr = Merchant.qrPayload(dashboard.merchant);
assert(qr === "NEXAPAY:MERCHANT:NPM-1001", "Merchant QR payload should contain only the safe internal merchant identifier.");
assert(!qr.toLowerCase().includes("token"), "Merchant QR payload must not contain secrets.");

const avaPayments = Merchant.filterPayments(dashboard.payments, { userId, query: "Ava", status: "all" });
assert(avaPayments.some((tx) => tx.transaction_id === "NXP-DEMO-1002"), "Merchant payment search should find payments by customer name.");

const completedPayments = Merchant.filterPayments(dashboard.payments, { userId, status: "completed" });
assert(completedPayments.length === dashboard.payments.length, "Completed status filter should match seeded merchant payments.");

await Merchant.updateMerchantProfile(userId, {
  business_name: "Orion Mart Demo",
  category: "Grocery Lab",
  full_name: "Orion Merchant Owner",
  phone: "01710000011",
  avatar_url: "https://example.test/orion.png"
});

const updated = await Merchant.getMerchantRecord(userId);
const state = Wallet.getDashboardData(userId).state;

assert(updated.business_name === "Orion Mart Demo", "Merchant profile update should save business name.");
assert(updated.category === "Grocery Lab", "Merchant profile update should save category.");
assert(Merchant.qrPayload(updated) === "NEXAPAY:MERCHANT:NPM-1001", "Merchant profile update should not rewrite the safe QR identifier.");
assert(state.profiles.find((profile) => profile.id === userId).full_name === "Orion Merchant Owner", "Merchant profile update should save owner profile fields.");
assert(state.audit_logs.some((log) => log.action === "update_merchant_profile"), "Merchant profile updates should create a local audit record.");

console.log("Phase 15 smoke test passed: merchant protection, dashboard, stats, QR, search, receipts data, and profile management are correct.");
