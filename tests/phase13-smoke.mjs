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

const Transactions = await import("../js/services/transaction-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const userId = "usr_customer_ava";
const all = await Transactions.listTransactions(userId);
const summary = Transactions.summarizeTransactions(all, userId);

assert(all.length >= 8, "Seeded transaction history should include completed, pending, and failed records.");
assert(summary.moneyIn > 0, "Summary must include money-in amount.");
assert(summary.moneyOut > 0, "Summary must include money-out amount.");
assert(summary.pending >= 1, "Summary must count pending transactions.");

const moneyIn = Transactions.filterTransactions(all, { userId, filter: "money_in" });
const moneyOut = Transactions.filterTransactions(all, { userId, filter: "money_out" });
const failed = Transactions.filterTransactions(all, { userId, status: "failed" });
const merchantSearch = Transactions.filterTransactions(all, { userId, query: "Orion Mart" });
const idSearch = Transactions.filterTransactions(all, { userId, query: "NXP-DEMO-1002" });

assert(moneyIn.every((tx) => Transactions.directionFor(tx, userId) === "in"), "Money In filter must include only incoming records.");
assert(moneyOut.every((tx) => Transactions.directionFor(tx, userId) === "out"), "Money Out filter must include only outgoing records.");
assert(failed.some((tx) => tx.transaction_id === "NXP-DEMO-1008"), "Status filter must find failed demo transaction.");
assert(merchantSearch.some((tx) => tx.metadata?.merchant_name === "Orion Mart"), "Search must include metadata such as merchant names.");
assert(idSearch.length === 1 && idSearch[0].transaction_id === "NXP-DEMO-1002", "Search must find exact transaction IDs.");

const details = await Transactions.getTransactionById(userId, "NXP-DEMO-1002");
assert(details?.transaction_type === "merchant_payment", "Transaction details lookup must find transaction by transaction ID.");

const receiptText = Transactions.receiptText(details, userId);
assert(receiptText.includes("Educational Demo - No Real Money or Financial Transactions"), "Receipt text must include educational disclaimer.");
assert(receiptText.includes("Transaction ID: NXP-DEMO-1002"), "Receipt text must include transaction ID.");
assert(receiptText.includes("Merchant: Orion Mart"), "Receipt text must include service-specific details.");

console.log("Phase 13 smoke test passed: search, filters, status indicators, details lookup, summaries, and receipt text are correct.");
