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
const Agent = await import("../js/services/agent-service.js");
const Wallet = await import("../js/services/wallet-service.js");
const Transactions = await import("../js/services/transaction-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value) {
  return Number(Number(value).toFixed(2));
}

const agentProfile = Auth.startDemoSession("agent");
const agentUserId = agentProfile.id;

assert(agentProfile.role === "agent", "Demo agent session should use an agent profile.");
assert(Auth.requireRole(["agent"]).ok, "Agent route protection should allow an agent.");
assert(!Auth.requireRole(["merchant"]).ok, "Agent route protection should block merchant-only pages.");

const agentRecord = await Agent.getAgentRecord(agentUserId);
assert(agentRecord.agent_code === "NPA-2001", "Agent record should load the linked active demo agent.");

const customers = await Agent.searchCustomers("Ava", agentUserId);
const ava = customers.find((customer) => customer.id === "usr_customer_ava");
assert(ava, "Agent customer search should find registered demo customers.");

const agentStart = Wallet.getDashboardData(agentUserId).wallet.balance;
const avaStart = Wallet.getDashboardData(ava.id).wallet.balance;

const cashInKey = "agent-cash-in:test:1234567890";
const cashIn = await Agent.processCashIn({
  agentUserId,
  customer: ava,
  amount: 1000,
  idempotencyKey: cashInKey
});
const duplicateCashIn = await Agent.processCashIn({
  agentUserId,
  customer: ava,
  amount: 1000,
  idempotencyKey: cashInKey
});

assert(cashIn.transaction_type === "add_money", "Agent cash-in should create an add_money transaction.");
assert(cashIn.metadata.channel === "agent_cash_in", "Agent cash-in should include agent channel metadata.");
assert(duplicateCashIn.id === cashIn.id, "Duplicate cash-in request should return the original transaction.");
assert(round(Wallet.getDashboardData(agentUserId).wallet.balance) === round(agentStart - 1000), "Cash-in should deduct agent demo balance once.");
assert(round(Wallet.getDashboardData(ava.id).wallet.balance) === round(avaStart + 1000), "Cash-in should credit customer demo balance once.");
assert(Transactions.directionFor(cashIn, agentUserId) === "out", "Cash-in should be money out for the agent.");
assert(Transactions.directionFor(cashIn, ava.id) === "in", "Cash-in should be money in for the customer.");

const sami = (await Agent.searchCustomers("Sami", agentUserId)).find((customer) => customer.id === "usr_customer_sami");
assert(sami, "Agent customer search should find another registered customer.");

const agentBeforeCashOut = Wallet.getDashboardData(agentUserId).wallet.balance;
const samiStart = Wallet.getDashboardData(sami.id).wallet.balance;
const cashOutKey = "agent-cash-out:test:1234567890";
const cashOut = await Agent.processCashOut({
  agentUserId,
  customer: sami,
  amount: 500,
  idempotencyKey: cashOutKey
});
const duplicateCashOut = await Agent.processCashOut({
  agentUserId,
  customer: sami,
  amount: 500,
  idempotencyKey: cashOutKey
});

assert(cashOut.transaction_type === "cash_out", "Agent cash-out should create a cash_out transaction.");
assert(cashOut.metadata.agent_code === "NPA-2001", "Agent cash-out should include agent metadata.");
assert(cashOut.fee === 5, "Agent cash-out should calculate a one percent demo fee.");
assert(duplicateCashOut.id === cashOut.id, "Duplicate cash-out request should return the original transaction.");
assert(round(Wallet.getDashboardData(agentUserId).wallet.balance) === round(agentBeforeCashOut + 500), "Cash-out should credit agent demo balance once.");
assert(round(Wallet.getDashboardData(sami.id).wallet.balance) === round(samiStart - 505), "Cash-out should deduct amount plus fee from customer once.");

const history = await Agent.listAgentTransactions(agentUserId);
const summary = Agent.summarizeAgentTransactions(history, agentUserId);
const cashInRows = Agent.filterAgentTransactions(history, { userId: agentUserId, filter: "cash_in" });
const cashOutRows = Agent.filterAgentTransactions(history, { userId: agentUserId, filter: "cash_out" });

assert(history.some((tx) => tx.id === cashIn.id), "Agent history should include cash-in transaction.");
assert(history.some((tx) => tx.id === cashOut.id), "Agent history should include cash-out transaction.");
assert(summary.cashInAmount >= 1000, "Agent summary should include cash-in amount.");
assert(summary.cashOutAmount >= 500, "Agent summary should include cash-out amount.");
assert(cashInRows.some((tx) => tx.id === cashIn.id), "Agent cash-in filter should find cash-in records.");
assert(cashOutRows.some((tx) => tx.id === cashOut.id), "Agent cash-out filter should find cash-out records.");

const auditLogs = Wallet.getDashboardData(agentUserId).state.audit_logs;
assert(auditLogs.some((log) => log.action === "agent_cash_in" && log.actor_id === agentUserId), "Agent cash-in should create an audit log.");
assert(auditLogs.some((log) => log.action === "agent_cash_out" && log.actor_id === agentUserId), "Agent cash-out should create an audit log.");

console.log("Phase 16 smoke test passed: agent protection, customer search, cash-in, cash-out, stats, history, and audit records are correct.");
