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

const ServicePayment = await import("../js/services/service-payment-service.js");
const Wallet = await import("../js/services/wallet-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value) {
  return Number(Number(value).toFixed(2));
}

const userId = "usr_customer_ava";
const startingBalance = Wallet.getDashboardData(userId).wallet.balance;

const operators = await ServicePayment.listRechargeOperators();
const operator = operators.find((item) => item.name === "DemoTel") || operators[0];
const rechargeRequestId = "service:phase11:recharge:1234567890";
const recharge = await ServicePayment.submitRecharge({
  userId,
  phone: "01710000000",
  operator,
  planType: "prepaid",
  amount: 100,
  idempotencyKey: rechargeRequestId
});
const balanceAfterRecharge = Wallet.getDashboardData(userId).wallet.balance;
const duplicateRecharge = await ServicePayment.submitRecharge({
  userId,
  phone: "01710000000",
  operator,
  planType: "prepaid",
  amount: 100,
  idempotencyKey: rechargeRequestId
});

assert(recharge.transaction_type === "recharge", "Recharge must create a recharge transaction.");
assert(recharge.metadata.operator_name === operator.name, "Recharge metadata must record the fictional operator.");
assert(balanceAfterRecharge === startingBalance - 100, "Recharge must deduct the demo amount.");
assert(duplicateRecharge.id === recharge.id, "Duplicate recharge request must return the original transaction.");
assert(Wallet.getDashboardData(userId).wallet.balance === balanceAfterRecharge, "Duplicate recharge must not deduct twice.");

const categories = await ServicePayment.listBillCategories();
const providers = await ServicePayment.listBillProviders();
const category = categories.find((item) => item.name === "Electricity") || categories[0];
const provider = providers.find((item) => item.category_id === category.id);
const bill = await ServicePayment.submitBillPayment({
  userId,
  category,
  provider,
  accountNumber: "DEMO-123456",
  amount: 750,
  idempotencyKey: "service:phase11:bill:1234567890"
});

assert(bill.transaction_type === "bill_payment", "Bill flow must create a bill_payment transaction.");
assert(bill.metadata.provider_name === provider.name, "Bill metadata must record the fictional provider.");
assert(bill.metadata.demo_account_number === "DEMO-123456", "Bill metadata must record the demo account number.");

const banks = await ServicePayment.listBanks();
const bank = banks.find((item) => item.name === "Nova Bank") || banks[0];
const balanceBeforeBank = Wallet.getDashboardData(userId).wallet.balance;
const bankTransfer = await ServicePayment.submitBankTransfer({
  userId,
  bank,
  accountNumber: "9000-0000-0000",
  receiverName: "Demo Receiver",
  amount: 1000,
  reference: "Phase 11 test",
  idempotencyKey: "service:phase11:bank:1234567890"
});

assert(bankTransfer.transaction_type === "bank_transfer", "Bank flow must create a bank_transfer transaction.");
assert(bankTransfer.fee === 10, "Bank transfer must calculate a 1% demo fee.");
assert(bankTransfer.total_amount === 1010, "Bank transfer total must include fee.");
assert(bankTransfer.metadata.bank_name === bank.name, "Bank metadata must record the fictional bank.");
assert(bankTransfer.metadata.receiver_name === "Demo Receiver", "Bank metadata must record the fictional receiver.");
assert(round(Wallet.getDashboardData(userId).wallet.balance) === round(balanceBeforeBank - 1010), "Bank transfer must deduct amount plus fee.");

const historyTypes = Wallet.getTransactionsForUser(userId).map((tx) => tx.transaction_type);
assert(historyTypes.includes("recharge"), "Transaction history must include recharge.");
assert(historyTypes.includes("bill_payment"), "Transaction history must include bill payment.");
assert(historyTypes.includes("bank_transfer"), "Transaction history must include bank transfer.");

console.log("Phase 11 smoke test passed: recharge, bill payment, bank transfer, idempotency, metadata, fees, and history are correct.");
