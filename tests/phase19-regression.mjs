import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const Agent = await import("../js/services/agent-service.js");
const Contacts = await import("../js/services/contact-service.js");
const Donation = await import("../js/services/donation-service.js");
const Funding = await import("../js/services/funding-service.js");
const Merchant = await import("../js/services/merchant-service.js");
const MerchantPayment = await import("../js/services/merchant-payment-service.js");
const Notifications = await import("../js/services/notification-service.js");
const RequestMoney = await import("../js/services/request-money-service.js");
const Savings = await import("../js/services/savings-service.js");
const SendMoney = await import("../js/services/send-money-service.js");
const ServicePayment = await import("../js/services/service-payment-service.js");
const Transactions = await import("../js/services/transaction-service.js");
const Wallet = await import("../js/services/wallet-service.js");
const { money, escapeHtml, percent } = await import("../js/utils/format.js");
const { sanitizeDemoAssetUrl } = await import("../js/utils/security.js");

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

function assertThrows(fn, message) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  assert(thrown, message);
}

async function exists(relativePath) {
  try {
    await readFile(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectHtmlFiles(dir = projectRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git"].includes(entry.name)) files.push(...await collectHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

const expectedPages = {
  public: {
    index: "index.html",
    login: "login.html",
    signup: "signup.html",
    "forgot-password": "forgot-password.html",
    "reset-password": "reset-password.html"
  },
  customer: {
    "customer-dashboard": "pages/customer/dashboard.html",
    "send-money": "pages/customer/send-money.html",
    "request-money": "pages/customer/request-money.html",
    payment: "pages/customer/payment.html",
    scan: "pages/customer/scan.html",
    "add-money": "pages/customer/add-money.html",
    "cash-out": "pages/customer/cash-out.html",
    recharge: "pages/customer/recharge.html",
    bills: "pages/customer/bills.html",
    "bank-transfer": "pages/customer/bank-transfer.html",
    savings: "pages/customer/savings.html",
    donation: "pages/customer/donation.html",
    transactions: "pages/customer/transactions.html",
    "transaction-details": "pages/customer/transaction-details.html",
    notifications: "pages/customer/notifications.html",
    profile: "pages/customer/profile.html"
  },
  merchant: {
    "merchant-dashboard": "pages/merchant/merchant-dashboard.html",
    "merchant-payments": "pages/merchant/merchant-payments.html",
    "merchant-qr": "pages/merchant/merchant-qr.html",
    "merchant-profile": "pages/merchant/merchant-profile.html"
  },
  agent: {
    "agent-dashboard": "pages/agent/agent-dashboard.html",
    "agent-cash-in": "pages/agent/agent-cash-in.html",
    "agent-cash-out": "pages/agent/agent-cash-out.html",
    "agent-transactions": "pages/agent/agent-transactions.html"
  },
  admin: {
    "admin-dashboard": "pages/admin/admin-dashboard.html",
    "admin-users": "pages/admin/admin-users.html",
    "admin-merchants": "pages/admin/admin-merchants.html",
    "admin-agents": "pages/admin/admin-agents.html",
    "admin-transactions": "pages/admin/admin-transactions.html",
    "admin-services": "pages/admin/admin-services.html",
    "admin-announcements": "pages/admin/admin-announcements.html",
    "admin-promotions": "pages/admin/admin-promotions.html",
    "admin-audit-logs": "pages/admin/admin-audit-logs.html",
    "admin-settings": "pages/admin/admin-settings.html"
  }
};

const appJs = await readFile(path.join(projectRoot, "js/pages/app.js"), "utf8");
const cssResponsive = await readFile(path.join(projectRoot, "css/responsive.css"), "utf8");
const cssAdmin = await readFile(path.join(projectRoot, "css/admin.css"), "utf8");
const rls = await readFile(path.join(projectRoot, "supabase/migrations/003_rls_policies.sql"), "utf8");
const rpc = await readFile(path.join(projectRoot, "supabase/migrations/002_rpc_functions.sql"), "utf8");

for (const [group, pages] of Object.entries(expectedPages)) {
  for (const [pageName, relativePath] of Object.entries(pages)) {
    assert(await exists(relativePath), `${group} page file should exist: ${relativePath}`);
    const html = await readFile(path.join(projectRoot, relativePath), "utf8");
    assert(html.includes(`window.NEXAPAY_PAGE = "${pageName}"`), `${relativePath} should set page name ${pageName}.`);
    assert(html.includes('name="viewport"'), `${relativePath} should include a responsive viewport tag.`);
    assert(html.includes('type="module" src='), `${relativePath} should load the app module.`);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (url.startsWith("http") || url.startsWith("#")) continue;
      if (url.includes("nexapay-mark.svg") || url.endsWith(".css") || url.endsWith(".js")) {
        const target = path.normalize(path.join(path.dirname(path.join(projectRoot, relativePath)), url));
        assert(target.startsWith(projectRoot), `${relativePath} asset path should stay inside the project: ${url}`);
        assert(await exists(path.relative(projectRoot, target)), `${relativePath} should reference an existing asset: ${url}`);
      }
    }
  }
}

for (const [pageName] of Object.entries(expectedPages.public)) {
  assert(appJs.includes(`${pageName}:`) || appJs.includes(`"${pageName}":`), `Public route should exist for ${pageName}.`);
}
for (const section of ["customer", "merchant", "agent", "admin"]) {
  for (const pageName of Object.keys(expectedPages[section])) {
    assert(appJs.includes(`"${pageName}":`) || appJs.includes(`${pageName}:`), `Route map should include ${pageName}.`);
  }
}

const htmlFiles = await collectHtmlFiles();
const expectedHtmlCount = Object.values(expectedPages).reduce((sum, pages) => sum + Object.keys(pages).length, 0);
assert(htmlFiles.length >= expectedHtmlCount, "All expected HTML pages should be present.");
assert(cssResponsive.includes("@media (max-width: 760px)"), "Responsive CSS should include tablet/mobile breakpoint.");
assert(cssResponsive.includes("@media (max-width: 420px)"), "Responsive CSS should include narrow phone breakpoint.");
assert(cssAdmin.includes("@media (max-width: 980px)"), "Admin CSS should include responsive admin breakpoint.");
assert(cssResponsive.includes(".admin-shell"), "Admin shell should have responsive rules.");
assert(appJs.includes("Educational Demo"), "Rendered app shell should display the educational demo disclaimer.");

assert(money(25000) === "৳25,000", "Money formatting should render the taka symbol correctly.");
assert(escapeHtml("<script>") === "&lt;script&gt;", "HTML escaping should protect rendered user text.");
assert(percent(35, 100) === 35, "Savings percentage helper should calculate progress.");
assert(percent(200, 100) === 100, "Savings percentage helper should cap progress at 100.");
assert(sanitizeDemoAssetUrl("assets/images/demo.png") === "assets/images/demo.png", "Project asset URLs should be accepted.");
assertThrows(() => sanitizeDemoAssetUrl("javascript:alert(1)"), "Unsafe asset URLs should be rejected.");

await assertRejects(
  () => Auth.signUp({ fullName: "A", email: "bad", phone: "123", password: "short", confirmPassword: "short" }),
  "Signup should reject invalid profile and password input."
);

const signup = await Auth.signUp({
  fullName: "Phase Nineteen",
  email: "phase19@nexapay.test",
  phone: "01710001919",
  password: "PhaseTest123",
  confirmPassword: "PhaseTest123"
});
assert(signup.profile.role === "customer", "Local signup should create customer role.");
assert(Auth.requireRole(["customer"]).ok, "Signed-up customer should pass customer guard.");
await assertRejects(
  () => Auth.signUp({ fullName: "Duplicate", email: "phase19@nexapay.test", phone: "01710001920", password: "PhaseTest123", confirmPassword: "PhaseTest123" }),
  "Duplicate local signup email should be rejected."
);
await Auth.signOut();
await Auth.signIn({ email: "phase19@nexapay.test", password: "PhaseTest123" });
assert(Auth.getCurrentProfile().email === "phase19@nexapay.test", "Local sign-in should restore the signed-up profile.");
await Auth.requestDemoPasswordReset("phase19@nexapay.test");
await Auth.resetDemoPassword({ email: "phase19@nexapay.test", password: "PhaseReset123", confirmPassword: "PhaseReset123" });
await Auth.signOut();
await Auth.signIn({ email: "phase19@nexapay.test", password: "PhaseReset123" });
assert(Auth.getCurrentProfile().email === "phase19@nexapay.test", "Local reset password should allow the new password.");

const roleExpectations = {
  customer: { allow: ["customer"], deny: ["merchant", "agent", "admin"] },
  merchant: { allow: ["merchant"], deny: ["customer", "agent", "admin"] },
  agent: { allow: ["agent"], deny: ["customer", "merchant", "admin"] },
  admin: { allow: ["admin"], deny: ["customer", "merchant", "agent"] }
};
for (const [role, checks] of Object.entries(roleExpectations)) {
  Auth.startDemoSession(role);
  assert(Auth.requireRole(checks.allow).ok, `${role} should pass its own role guard.`);
  for (const deniedRole of checks.deny) {
    assert(!Auth.requireRole([deniedRole]).ok, `${role} should not pass ${deniedRole} guard.`);
  }
}

const adminProfile = Auth.startDemoSession("admin");
const adminData = await Admin.loadAdminData();
assert(!adminData.profiles.some((profile) => "password_hash" in profile || "password_salt" in profile), "Admin data should not expose local password hashes.");
await assertRejects(
  () => Admin.setAccountStatus(adminProfile.id, adminProfile.id, "suspended"),
  "Admin self-suspension should be rejected."
);
await assertRejects(
  () => Admin.saveManagedItem(adminProfile.id, "unknown_table", { name: "Bad" }),
  "Unsupported admin content table should be rejected."
);

const customer = Auth.startDemoSession("customer");
const customerId = customer.id;
const recipients = SendMoney.getInitialRecipients(customerId);
assert(recipients.length > 0, "Customer should have initial send-money recipients.");
await assertRejects(
  () => SendMoney.submitSendMoney({ senderId: customerId, receiver: customer, amount: 10, reference: "Self", idempotencyKey: "phase19-self-send-key" }),
  "Send Money should reject sending to yourself."
);
await assertRejects(
  () => SendMoney.submitSendMoney({ senderId: customerId, receiver: recipients[0], amount: 1.123, reference: "Too precise", idempotencyKey: "phase19-precision-send-key" }),
  "Send Money should reject more than two decimal places."
);
const sendTx = await SendMoney.submitSendMoney({
  senderId: customerId,
  receiver: recipients[0],
  amount: 25,
  reference: "Phase 19",
  idempotencyKey: "phase19-valid-send-key-0001"
});
assert(sendTx.transaction_type === "send_money", "Valid Send Money should create a send_money transaction.");

const requestContacts = RequestMoney.getInitialRequestContacts(customerId);
await assertRejects(
  () => RequestMoney.createMoneyRequest({ senderId: customerId, receiver: customer, amount: 10, note: "Self", idempotencyKey: "phase19-self-request-key" }),
  "Request Money should reject requesting from yourself."
);
const request = await RequestMoney.createMoneyRequest({
  senderId: customerId,
  receiver: requestContacts[0],
  amount: 35,
  note: "Phase 19 request",
  idempotencyKey: "phase19-money-request-key"
});
assert(request.status === "pending", "Money request should start as pending.");
await assertRejects(
  () => RequestMoney.cancelMoneyRequest({ request, actorId: request.receiver_id }),
  "Only request sender should cancel a request."
);
const cancelledRequest = await RequestMoney.cancelMoneyRequest({ request, actorId: customerId });
assert(cancelledRequest.status === "cancelled", "Request cancellation should update status.");

const merchants = MerchantPayment.getInitialMerchants();
assert(merchants.length > 0, "Merchant payment should have active merchants.");
const merchant = merchants[0];
assert(MerchantPayment.qrValueForMerchant(merchant).startsWith("NEXAPAY:MERCHANT:"), "Merchant QR should use safe internal identifier.");
assert(!MerchantPayment.qrValueForMerchant(merchant).toLowerCase().includes("token"), "Merchant QR should not contain tokens.");
await assertRejects(
  () => MerchantPayment.submitMerchantPayment({ customerId, merchant, amount: 0, reference: "Bad", idempotencyKey: "phase19-bad-merchant-pay" }),
  "Merchant Payment should reject zero amount."
);
const paymentTx = await MerchantPayment.submitMerchantPayment({
  customerId,
  merchant,
  amount: 40,
  reference: "Phase 19 merchant",
  idempotencyKey: "phase19-merchant-payment-key"
});
assert(paymentTx.transaction_type === "merchant_payment", "Merchant Payment should create merchant_payment transaction.");

await assertRejects(
  () => Funding.addDemoMoney({ userId: customerId, amount: 750, source: Funding.DEMO_FUNDING_SOURCES[0].name, idempotencyKey: "phase19-bad-add-money" }),
  "Add Money should reject non-predefined amounts."
);
const addTx = await Funding.addDemoMoney({
  userId: customerId,
  amount: 500,
  source: Funding.DEMO_FUNDING_SOURCES[0].name,
  idempotencyKey: "phase19-add-money-key"
});
assert(addTx.transaction_type === "add_money", "Add Money should create add_money transaction.");
const agents = Funding.getInitialAgents();
await assertRejects(
  () => Funding.cashOut({ userId: customerId, agent: { id: "bad" }, amount: 10, idempotencyKey: "phase19-bad-cashout" }),
  "Cash Out should require a registered active agent."
);
const cashOutTx = await Funding.cashOut({
  userId: customerId,
  agent: agents[0],
  amount: 20,
  idempotencyKey: "phase19-cashout-key"
});
assert(cashOutTx.transaction_type === "cash_out", "Cash Out should create cash_out transaction.");

const operators = await ServicePayment.listRechargeOperators();
await assertRejects(
  () => ServicePayment.submitRecharge({ userId: customerId, phone: "12", operator: operators[0], planType: "prepaid", amount: 20, idempotencyKey: "phase19-bad-recharge" }),
  "Recharge should reject invalid demo phone numbers."
);
const rechargeTx = await ServicePayment.submitRecharge({
  userId: customerId,
  phone: "01710001919",
  operator: operators[0],
  planType: "prepaid",
  amount: 20,
  idempotencyKey: "phase19-recharge-key"
});
assert(rechargeTx.transaction_type === "recharge", "Recharge should create recharge transaction.");

const categories = await ServicePayment.listBillCategories();
const providers = await ServicePayment.listBillProviders();
await assertRejects(
  () => ServicePayment.submitBillPayment({ userId: customerId, category: categories[0], provider: providers.find((provider) => provider.category_id !== categories[0].id), accountNumber: "DEMO-1234", amount: 10, idempotencyKey: "phase19-bad-bill" }),
  "Bill payment should reject provider/category mismatch."
);
const matchingProvider = providers.find((provider) => provider.category_id === categories[0].id);
const billTx = await ServicePayment.submitBillPayment({
  userId: customerId,
  category: categories[0],
  provider: matchingProvider,
  accountNumber: "DEMO-1234",
  amount: 10,
  idempotencyKey: "phase19-bill-key"
});
assert(billTx.transaction_type === "bill_payment", "Bill Payment should create bill_payment transaction.");

const banks = await ServicePayment.listBanks();
await assertRejects(
  () => ServicePayment.submitBankTransfer({ userId: customerId, bank: banks[0], accountNumber: "1", receiverName: "A", amount: 10, reference: "Bad", idempotencyKey: "phase19-bad-bank" }),
  "Bank Transfer should reject weak fictional account/receiver data."
);
const bankTx = await ServicePayment.submitBankTransfer({
  userId: customerId,
  bank: banks[0],
  accountNumber: "NOVA-123456",
  receiverName: "Demo Receiver",
  amount: 10,
  reference: "Phase 19 bank",
  idempotencyKey: "phase19-bank-key"
});
assert(bankTx.transaction_type === "bank_transfer", "Bank Transfer should create bank_transfer transaction.");

await assertRejects(
  () => Savings.createSavingsGoal(customerId, { title: "X", targetAmount: 0, targetDate: "2026-12-31" }),
  "Savings should reject invalid goal input."
);
const goal = await Savings.createSavingsGoal(customerId, { title: "Phase 19 Goal", targetAmount: 1000, targetDate: "2026-12-31" });
const savingTx = await Savings.moveSavingsMoney({
  userId: customerId,
  goal,
  amount: 50,
  direction: "deposit",
  note: "Phase 19",
  idempotencyKey: "phase19-savings-key"
});
assert(savingTx.transaction.transaction_type === "savings_deposit", "Savings deposit should create savings_deposit transaction.");

const orgs = await Donation.listDonationOrganizations();
await assertRejects(
  () => Donation.submitDonation({ userId: customerId, organization: orgs[0], amount: 10, message: "x".repeat(241), idempotencyKey: "phase19-bad-donation" }),
  "Donation should reject long messages."
);
const donationTx = await Donation.submitDonation({
  userId: customerId,
  organization: orgs[0],
  amount: 10,
  message: "Phase 19 donation",
  idempotencyKey: "phase19-donation-key"
});
assert(donationTx.transaction_type === "donation", "Donation should create donation transaction.");

const notifications = await Notifications.listNotifications(customerId);
assert(Notifications.unreadCount(notifications) >= 0, "Notification unread count should be calculable.");
if (notifications[0]) {
  const marked = await Notifications.markNotification(notifications[0].id, customerId, true);
  assert(marked.is_read === true, "Notification read state should update.");
}

const favoriteRows = await Contacts.listFavorites(customerId);
await Contacts.addFavorite(customerId, recipients[0].id);
const updatedFavorites = await Contacts.listFavorites(customerId);
assert(updatedFavorites.length >= favoriteRows.length, "Favorites should add or keep duplicate-safe contacts.");
const recentContacts = await Contacts.listRecentContacts(customerId);
assert(Array.isArray(recentContacts), "Recent contacts should be derived without device contact access.");

const txs = await Transactions.listTransactions(customerId);
assert(txs.some((tx) => tx.id === sendTx.id), "Transaction history should include new send transaction.");
assert(Transactions.filterTransactions(txs, { userId: customerId, filter: "money_out" }).length > 0, "Money-out filter should find outgoing records.");
assert(Transactions.receiptText(sendTx, customerId).includes("Educational Demo"), "Receipt text should include educational disclaimer.");

const merchantProfile = Auth.startDemoSession("merchant");
const merchantDashboard = await Merchant.getMerchantDashboard(merchantProfile.id);
assert(merchantDashboard.summary.count >= 1, "Merchant dashboard should calculate received payment stats.");
await assertRejects(
  () => Merchant.updateMerchantProfile(merchantProfile.id, { business_name: "A", category: "B", full_name: "C", phone: "1", avatar_url: "javascript:alert(1)" }),
  "Merchant profile should reject invalid fields and unsafe avatar URLs."
);

const agentProfile = Auth.startDemoSession("agent");
const agentRecord = await Agent.getAgentRecord(agentProfile.id);
assert(agentRecord.status === "active", "Agent dashboard should load active agent record.");
await assertRejects(
  () => Agent.processCashIn({ agentUserId: agentProfile.id, customer: { id: "bad", role: "merchant" }, amount: 10, idempotencyKey: "phase19-bad-agent" }),
  "Agent cash-in should require a registered demo customer."
);

assert(rls.includes("revoke all on all tables in schema public from anon;"), "RLS should revoke anonymous table access.");
assert(!rls.includes("on public.wallets for update"), "RLS should block direct wallet updates.");
assert(!rls.includes("on public.transactions for insert"), "RLS should block direct transaction inserts.");
assert(rpc.includes("admin_save_managed_item"), "RPC migration should include audited admin content save.");
assert(rpc.includes("admin_save_promotion"), "RPC migration should include audited promotion save.");

console.log("Phase 19 regression test passed: pages, roles, auth, validation rules, transaction flows, admin actions, responsive CSS, and security/database invariants are correct.");
