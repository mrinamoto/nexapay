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

const Funding = await import("../js/services/funding-service.js");
const Wallet = await import("../js/services/wallet-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const userId = "usr_customer_ava";
const startingBalance = Wallet.getDashboardData(userId).wallet.balance;
const addRequestId = "add-money:phase10-test:1234567890";

const firstAdd = await Funding.addDemoMoney({
  userId,
  amount: 1000,
  source: "Nova Bank Demo",
  idempotencyKey: addRequestId
});
const balanceAfterAdd = Wallet.getDashboardData(userId).wallet.balance;
const duplicateAdd = await Funding.addDemoMoney({
  userId,
  amount: 1000,
  source: "Nova Bank Demo",
  idempotencyKey: addRequestId
});

assert(firstAdd.transaction_type === "add_money", "Add Money must create an add_money transaction.");
assert(balanceAfterAdd === startingBalance + 1000, "Add Money must credit the selected predefined amount.");
assert(duplicateAdd.id === firstAdd.id, "An identical request ID must return the original transaction.");
assert(Wallet.getDashboardData(userId).wallet.balance === balanceAfterAdd, "A duplicate Add Money request must not credit twice.");

const agent = Funding.getInitialAgents()[0];
const agentStartingBalance = Wallet.getDashboardData(agent.user_id).wallet.balance;
const cashOut = await Funding.cashOut({
  userId,
  agent,
  amount: 250,
  idempotencyKey: "cash-out:phase10-test:1234567890"
});

assert(cashOut.transaction_type === "cash_out", "Cash Out must create a cash_out transaction.");
assert(cashOut.fee === 2.5, "Cash Out must calculate a 1% fee to two decimal places.");
assert(cashOut.total_amount === 252.5, "Cash Out total must include the demo fee.");
assert(Wallet.getDashboardData(userId).wallet.balance === balanceAfterAdd - 252.5, "Cash Out must deduct amount plus fee.");
assert(Wallet.getDashboardData(agent.user_id).wallet.balance === agentStartingBalance + 250, "Cash Out must credit the registered demo agent.");
assert(cashOut.metadata.agent_code === agent.agent_code, "The transaction must record the selected registered agent.");
assert(Wallet.getTransactionsForUser(userId).some((tx) => tx.id === cashOut.id), "Customer transaction history must include Cash Out.");
assert(Wallet.getTransactionsForUser(agent.user_id).some((tx) => tx.id === cashOut.id), "Agent transaction history must include Cash Out.");

console.log("Phase 10 smoke test passed: Add Money, idempotency, Cash Out, fees, balances, and history are correct.");
