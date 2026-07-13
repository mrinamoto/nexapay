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

const Savings = await import("../js/services/savings-service.js");
const Donation = await import("../js/services/donation-service.js");
const Wallet = await import("../js/services/wallet-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value) {
  return Number(Number(value).toFixed(2));
}

const userId = "usr_customer_ava";
const startingBalance = Wallet.getDashboardData(userId).wallet.balance;
const initialGoals = await Savings.listSavingsGoals(userId);
const seededGoal = initialGoals.find((goal) => goal.id === "svg_laptop");

assert(seededGoal, "Seeded New Laptop savings goal must exist.");
assert(seededGoal.entries.some((entry) => entry.note === "Opening demo savings balance"), "Seeded goal must include opening history.");

const goal = await Savings.createSavingsGoal(userId, {
  title: "Emergency Demo Fund",
  targetAmount: 5000,
  targetDate: "2026-12-31"
});

assert(goal.title === "Emergency Demo Fund", "Savings goal must be created with the requested title.");
assert(goal.current_amount === 0, "New savings goal must start at zero.");

const depositRequestId = "savings:phase12:deposit:1234567890";
const deposit = await Savings.moveSavingsMoney({
  userId,
  goal,
  amount: 1000,
  direction: "deposit",
  note: "First demo deposit",
  idempotencyKey: depositRequestId
});
const balanceAfterDeposit = Wallet.getDashboardData(userId).wallet.balance;
const duplicateDeposit = await Savings.moveSavingsMoney({
  userId,
  goal,
  amount: 1000,
  direction: "deposit",
  note: "First demo deposit",
  idempotencyKey: depositRequestId
});

assert(deposit.transaction.transaction_type === "savings_deposit", "Deposit must create a savings_deposit transaction.");
assert(deposit.transaction.metadata.savings_goal_title === "Emergency Demo Fund", "Deposit receipt metadata must include goal title.");
assert(balanceAfterDeposit === startingBalance - 1000, "Savings deposit must deduct from demo wallet balance.");
assert(duplicateDeposit.transaction.id === deposit.transaction.id, "Duplicate deposit request must return original transaction.");
assert(Wallet.getDashboardData(userId).wallet.balance === balanceAfterDeposit, "Duplicate deposit must not deduct twice.");

const goalsAfterDeposit = await Savings.listSavingsGoals(userId);
const updatedGoal = goalsAfterDeposit.find((item) => item.id === goal.id);
assert(updatedGoal.current_amount === 1000, "Savings goal progress must increase after deposit.");
assert(updatedGoal.entries.some((entry) => entry.note === "First demo deposit"), "Deposit must create a savings history entry.");

const withdrawal = await Savings.moveSavingsMoney({
  userId,
  goal: updatedGoal,
  amount: 400,
  direction: "withdrawal",
  note: "Demo withdrawal",
  idempotencyKey: "savings:phase12:withdraw:1234567890"
});

assert(withdrawal.transaction.transaction_type === "savings_withdrawal", "Withdrawal must create a savings_withdrawal transaction.");
assert(round(Wallet.getDashboardData(userId).wallet.balance) === round(balanceAfterDeposit + 400), "Savings withdrawal must credit demo wallet balance.");

const organizations = await Donation.listDonationOrganizations();
const organization = organizations.find((item) => item.name === "Future Learners Fund") || organizations[0];
const balanceBeforeDonation = Wallet.getDashboardData(userId).wallet.balance;
const donationRequestId = "donation:phase12:test:1234567890";
const donation = await Donation.submitDonation({
  userId,
  organization,
  amount: 250,
  message: "Keep learning in the demo.",
  idempotencyKey: donationRequestId
});
const balanceAfterDonation = Wallet.getDashboardData(userId).wallet.balance;
const duplicateDonation = await Donation.submitDonation({
  userId,
  organization,
  amount: 250,
  message: "Keep learning in the demo.",
  idempotencyKey: donationRequestId
});

assert(donation.transaction_type === "donation", "Donation must create a donation transaction.");
assert(donation.metadata.organization_name === organization.name, "Donation metadata must include fictional organization.");
assert(donation.metadata.message === "Keep learning in the demo.", "Donation metadata must include optional message.");
assert(balanceAfterDonation === balanceBeforeDonation - 250, "Donation must deduct demo wallet balance.");
assert(duplicateDonation.id === donation.id, "Duplicate donation request must return original transaction.");
assert(Wallet.getDashboardData(userId).wallet.balance === balanceAfterDonation, "Duplicate donation must not deduct twice.");

const historyTypes = Wallet.getTransactionsForUser(userId).map((tx) => tx.transaction_type);
assert(historyTypes.includes("savings_deposit"), "Transaction history must include savings deposit.");
assert(historyTypes.includes("savings_withdrawal"), "Transaction history must include savings withdrawal.");
assert(historyTypes.includes("donation"), "Transaction history must include donation.");

console.log("Phase 12 smoke test passed: savings goals, progress, entries, withdrawals, donation receipts, idempotency, and history are correct.");
