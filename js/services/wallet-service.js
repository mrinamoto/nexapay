import { getState, saveState, withState, resetState } from "./storage.js";
import { sanitizeDemoAssetUrl } from "../utils/security.js";

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeTransactionId() {
  return `NXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function now() {
  return new Date().toISOString();
}

function walletByUser(state, userId) {
  return state.wallets.find((wallet) => wallet.user_id === userId);
}

function profileById(state, userId) {
  return state.profiles.find((profile) => profile.id === userId);
}

function ensureActive(profile, wallet, label) {
  if (!profile) throw new Error(`${label} profile was not found.`);
  if (profile.account_status !== "active") throw new Error(`${label} account is not active.`);
  if (!wallet || wallet.status !== "active") throw new Error(`${label} wallet is not active.`);
}

function feeFor(type, amount) {
  const value = Number(amount);
  if (["send_money", "cash_out", "bank_transfer"].includes(type)) {
    return Math.max(0, Math.round(value * 0.01 * 100) / 100);
  }
  return 0;
}

function notify(state, userId, title, message, type) {
  if (!userId) return;
  state.notifications.push({
    id: makeId("ntf"),
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    created_at: now()
  });
}

function audit(state, actorId, action, entityType, entityId, metadata = {}) {
  state.audit_logs.push({
    id: makeId("aud"),
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    created_at: now()
  });
}

export function getDashboardData(userId) {
  const state = getState();
  const profile = profileById(state, userId);
  const wallet = walletByUser(state, userId);
  const transactions = getTransactionsForUser(userId).slice(0, 5);
  const favorites = state.favorites
    .filter((favorite) => favorite.user_id === userId)
    .map((favorite) => profileById(state, favorite.favorite_user_id))
    .filter(Boolean);
  return {
    state,
    profile,
    wallet,
    transactions,
    favorites,
    unreadCount: state.notifications.filter((item) => item.user_id === userId && !item.is_read).length,
    promotion: state.promotions.find((item) => item.status === "active")
  };
}

export function getContacts({ includeRoles = ["customer", "merchant", "agent"], excludeUserId = "" } = {}) {
  return getState().profiles
    .filter((profile) => includeRoles.includes(profile.role))
    .filter((profile) => profile.id !== excludeUserId)
    .filter((profile) => profile.account_status === "active");
}

export function getMerchants() {
  const state = getState();
  return state.merchants.map((merchant) => ({
    ...merchant,
    owner: profileById(state, merchant.owner_id),
    wallet: walletByUser(state, merchant.owner_id)
  }));
}

export function getAgents() {
  const state = getState();
  return state.agents.map((agent) => ({
    ...agent,
    profile: profileById(state, agent.user_id),
    wallet: walletByUser(state, agent.user_id)
  }));
}

export function calculateFee(type, amount) {
  return feeFor(type, amount);
}

export function transferDemoMoney({ senderId, receiverId, amount, type = "send_money", reference = "", metadata = {}, idempotencyKey = "" }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Enter an amount greater than zero.");
  if (numericAmount > 100000) throw new Error("The maximum demo transaction amount is ৳100,000.");
  if (senderId === receiverId && !["savings_deposit", "savings_withdrawal"].includes(type)) {
    throw new Error("This demo does not allow sending money to yourself.");
  }

  return withState((state) => {
    if (idempotencyKey) {
      const duplicate = state.transactions.find((item) => item.idempotency_key === idempotencyKey);
      if (duplicate) return duplicate;
    }

    const senderProfile = profileById(state, senderId);
    const receiverProfile = profileById(state, receiverId);
    const senderWallet = walletByUser(state, senderId);
    const receiverWallet = walletByUser(state, receiverId);
    ensureActive(senderProfile, senderWallet, "Sender");
    ensureActive(receiverProfile, receiverWallet, "Receiver");

    const fee = feeFor(type, numericAmount);
    const total = numericAmount + fee;
    if (senderWallet.balance < total) throw new Error("Insufficient demo balance.");

    senderWallet.balance = Number((senderWallet.balance - total).toFixed(2));
    receiverWallet.balance = Number((receiverWallet.balance + numericAmount).toFixed(2));
    senderWallet.updated_at = now();
    receiverWallet.updated_at = now();

    const tx = {
      id: makeId("tx"),
      transaction_id: makeTransactionId(),
      transaction_type: type,
      sender_wallet_id: senderWallet.id,
      receiver_wallet_id: receiverWallet.id,
      sender_id: senderId,
      receiver_id: receiverId,
      amount: numericAmount,
      fee,
      total_amount: total,
      status: "completed",
      reference,
      metadata,
      idempotency_key: idempotencyKey || makeId("idem"),
      created_at: now()
    };

    state.transactions.unshift(tx);
    notify(state, senderId, "Demo money sent", `${receiverProfile.full_name} received ৳${numericAmount}.`, "money_sent");
    notify(state, receiverId, "Demo money received", `${senderProfile.full_name} sent you ৳${numericAmount}.`, "money_received");
    audit(state, senderId, "transfer_demo_money", "transactions", tx.id, { type, amount: numericAmount });
    return tx;
  });
}

export function addDemoMoney(userId, { amount, source, idempotencyKey = "" }) {
  const numericAmount = Number(amount);
  if (![500, 1000, 2000, 5000].includes(numericAmount)) throw new Error("Choose one of the predefined demo amounts.");

  return withState((state) => {
    if (idempotencyKey) {
      const duplicate = state.transactions.find((item) => item.idempotency_key === idempotencyKey);
      if (duplicate) {
        if (duplicate.receiver_id === userId && duplicate.transaction_type === "add_money") return duplicate;
        throw new Error("Duplicate demo transaction request identifier.");
      }
    }

    const profile = profileById(state, userId);
    const wallet = walletByUser(state, userId);
    ensureActive(profile, wallet, "Receiver");

    const today = new Date().toISOString().slice(0, 10);
    const todayTotal = state.transactions
      .filter((item) => item.receiver_id === userId && item.transaction_type === "add_money")
      .filter((item) => item.status === "completed" && item.created_at.slice(0, 10) === today)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    if (todayTotal + numericAmount > 20000) throw new Error("Daily add demo money limit exceeded.");

    wallet.balance = Number((wallet.balance + numericAmount).toFixed(2));
    wallet.updated_at = now();

    const tx = {
      id: makeId("tx"),
      transaction_id: makeTransactionId(),
      transaction_type: "add_money",
      sender_wallet_id: null,
      receiver_wallet_id: wallet.id,
      sender_id: null,
      receiver_id: userId,
      amount: numericAmount,
      fee: 0,
      total_amount: numericAmount,
      status: "completed",
      reference: source,
      metadata: { source, disclaimer: "No real bank or card is connected." },
      idempotency_key: idempotencyKey || makeId("idem"),
      created_at: now()
    };

    state.transactions.unshift(tx);
    notify(state, userId, "Demo money added", `৳${numericAmount} was added from ${source}.`, "money_received");
    audit(state, userId, "add_demo_money", "transactions", tx.id, { source });
    return tx;
  });
}

export function createMoneyRequest({ senderId, receiverId, amount, note, idempotencyKey = "" }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Enter a valid request amount.");
  if (senderId === receiverId) throw new Error("You cannot request money from yourself.");

  return withState((state) => {
    if (idempotencyKey) {
      const duplicate = state.money_requests.find((item) => item.idempotency_key === idempotencyKey);
      if (duplicate) return duplicate;
    }

    const requester = profileById(state, senderId);
    const receiver = profileById(state, receiverId);
    ensureActive(requester, walletByUser(state, senderId), "Requester");
    ensureActive(receiver, walletByUser(state, receiverId), "Receiver");

    const request = {
      id: makeId("req"),
      sender_id: senderId,
      receiver_id: receiverId,
      amount: numericAmount,
      note,
      status: "pending",
      idempotency_key: idempotencyKey || makeId("idem"),
      created_at: now(),
      updated_at: now()
    };
    state.money_requests.unshift(request);
    notify(state, receiverId, "Demo money request", `${requester.full_name} requested ৳${numericAmount}.`, "request_received");
    audit(state, senderId, "create_money_request", "money_requests", request.id, { amount: numericAmount });
    return request;
  });
}

export function respondToMoneyRequest({ requestId, actorId, response }) {
  const state = getState();
  const request = state.money_requests.find((item) => item.id === requestId);
  if (!request) throw new Error("Money request was not found.");
  if (request.receiver_id !== actorId) throw new Error("Only the request receiver can respond.");
  if (request.status !== "pending") throw new Error("This request has already been handled.");

  if (response === "declined") {
    request.status = "declined";
    request.updated_at = now();
    notify(state, request.sender_id, "Demo request declined", "Your demo money request was declined.", "request_declined");
    audit(state, actorId, "decline_money_request", "money_requests", request.id);
    saveState(state);
    return { request };
  }

  const tx = transferDemoMoney({
    senderId: request.receiver_id,
    receiverId: request.sender_id,
    amount: request.amount,
    type: "request_money",
    reference: request.note,
    metadata: { request_id: request.id },
    idempotencyKey: `request:${request.id}`
  });

  const updated = getState();
  const updatedRequest = updated.money_requests.find((item) => item.id === requestId);
  updatedRequest.status = "accepted";
  updatedRequest.updated_at = now();
  notify(updated, request.sender_id, "Demo request accepted", "Your demo money request was accepted.", "request_accepted");
  audit(updated, actorId, "accept_money_request", "money_requests", request.id, { transaction_id: tx.transaction_id });
  saveState(updated);
  return { request: updatedRequest, transaction: tx };
}

export function cancelMoneyRequest({ requestId, actorId }) {
  return withState((state) => {
    const request = state.money_requests.find((item) => item.id === requestId);
    if (!request) throw new Error("Money request was not found.");
    if (request.sender_id !== actorId) throw new Error("Only the requester can cancel this request.");
    if (request.status !== "pending") throw new Error("Only pending requests can be cancelled.");

    request.status = "cancelled";
    request.updated_at = now();
    notify(state, request.receiver_id, "Demo request cancelled", "A pending demo money request was cancelled.", "request_cancelled");
    audit(state, actorId, "cancel_money_request", "money_requests", request.id);
    return request;
  });
}

export function merchantPayment({ customerId, merchantId, amount, reference, idempotencyKey }) {
  const merchant = getState().merchants.find((item) => item.id === merchantId);
  if (!merchant || merchant.status !== "active") throw new Error("Active demo merchant was not found.");
  return transferDemoMoney({
    senderId: customerId,
    receiverId: merchant.owner_id,
    amount,
    type: "merchant_payment",
    reference,
    metadata: { merchant_id: merchant.id, merchant_name: merchant.business_name, category: merchant.category },
    idempotencyKey
  });
}

export function findMerchantByQr(qrIdentifier) {
  return getMerchants().find((merchant) => merchant.qr_identifier.trim().toLowerCase() === qrIdentifier.trim().toLowerCase());
}

export function servicePayment({ userId, amount, type, reference, metadata, idempotencyKey = "" }) {
  return transferDemoMoney({
    senderId: userId,
    receiverId: "usr_system",
    amount,
    type,
    reference,
    metadata,
    idempotencyKey: idempotencyKey || makeId("idem")
  });
}

export function cashOut({ userId, agentId, amount, idempotencyKey = "" }) {
  const agent = getState().agents.find((item) => item.id === agentId);
  if (!agent || agent.status !== "active") throw new Error("Active demo agent was not found.");
  const agentProfile = profileById(getState(), agent.user_id);
  return transferDemoMoney({
    senderId: userId,
    receiverId: agent.user_id,
    amount,
    type: "cash_out",
    reference: "Simulation Only - No Real Cash Is Dispensed",
    metadata: {
      agent_id: agent.id,
      agent_code: agent.agent_code,
      agent_name: agentProfile?.full_name || "Registered Demo Agent",
      agent_location: agent.location,
      channel: "registered_demo_agent",
      simulation_only: true
    },
    idempotencyKey: idempotencyKey || makeId("idem")
  });
}

export function cashIn({ agentUserId, customerId, amount }) {
  return transferDemoMoney({
    senderId: agentUserId,
    receiverId: customerId,
    amount,
    type: "add_money",
    reference: "Agent cash-in simulation",
    metadata: { channel: "agent_cash_in" },
    idempotencyKey: makeId("idem")
  });
}

export function getTransactionsForUser(userId) {
  const state = getState();
  const wallet = walletByUser(state, userId);
  if (!wallet) return [];
  return state.transactions
    .filter((tx) => tx.sender_wallet_id === wallet.id || tx.receiver_wallet_id === wallet.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getTransactionById(id) {
  return getState().transactions.find((tx) => tx.id === id || tx.transaction_id === id);
}

export function getIncomingRequests(userId) {
  const state = getState();
  return state.money_requests
    .filter((request) => request.receiver_id === userId || request.sender_id === userId)
    .map((request) => ({
      ...request,
      sender: profileById(state, request.sender_id),
      receiver: profileById(state, request.receiver_id)
    }));
}

export function listNotifications(userId) {
  return getState().notifications
    .filter((item) => item.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function markNotification(id, userId, read = true) {
  return withState((state) => {
    const notification = state.notifications.find((item) => item.id === id && item.user_id === userId);
    if (notification) notification.is_read = read;
    return notification;
  });
}

export function markAllNotifications(userId) {
  return withState((state) => {
    state.notifications.filter((item) => item.user_id === userId).forEach((item) => {
      item.is_read = true;
    });
  });
}

export function deleteNotification(id, userId) {
  return withState((state) => {
    state.notifications = state.notifications.filter((item) => !(item.id === id && item.user_id === userId));
  });
}

export function toggleFavorite(userId, favoriteUserId) {
  return withState((state) => {
    const existing = state.favorites.find((item) => item.user_id === userId && item.favorite_user_id === favoriteUserId);
    if (existing) {
      state.favorites = state.favorites.filter((item) => item.id !== existing.id);
      return false;
    }
    state.favorites.push({ id: makeId("fav"), user_id: userId, favorite_user_id: favoriteUserId, created_at: now() });
    return true;
  });
}

export function updateProfile(userId, fields) {
  return withState((state) => {
    const profile = profileById(state, userId);
    if (!profile) throw new Error("Profile was not found.");
    profile.full_name = fields.full_name?.trim() || profile.full_name;
    profile.phone = fields.phone?.trim() || profile.phone;
    profile.avatar_url = sanitizeDemoAssetUrl(fields.avatar_url ?? profile.avatar_url);
    profile.updated_at = now();
    return profile;
  });
}

export function createSavingsGoal(userId, { title, targetAmount, targetDate }) {
  const amount = Number(targetAmount);
  const cleanTitle = (title || "").trim();
  if (!cleanTitle || cleanTitle.length < 2 || cleanTitle.length > 120 || !Number.isFinite(amount) || amount <= 0 || !targetDate) {
    throw new Error("Enter a title, target amount, and target date.");
  }
  if (amount > 1000000) throw new Error("The maximum demo savings target is 1,000,000.");
  return withState((state) => {
    const goal = {
      id: makeId("svg"),
      user_id: userId,
      title: cleanTitle,
      target_amount: Number(amount.toFixed(2)),
      current_amount: 0,
      target_date: targetDate,
      status: "active",
      created_at: now()
    };
    state.savings_goals.unshift(goal);
    audit(state, userId, "create_savings_goal", "savings_goals", goal.id);
    return goal;
  });
}

export function moveSavings({ userId, goalId, amount, direction, note = "", idempotencyKey = "" }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("Enter a valid savings amount.");
  if (numericAmount > 100000) throw new Error("The maximum demo savings movement is 100,000.");

  return withState((state) => {
    state.savings_goal_entries ||= [];
    if (idempotencyKey) {
      const duplicate = state.transactions.find((item) => item.idempotency_key === idempotencyKey);
      if (duplicate) {
        const duplicateGoal = state.savings_goals.find((item) => item.id === duplicate.metadata?.savings_goal_id);
        return { goal: duplicateGoal, transaction: duplicate };
      }
    }

    const wallet = walletByUser(state, userId);
    const profile = profileById(state, userId);
    const goal = state.savings_goals.find((item) => item.id === goalId && item.user_id === userId);
    ensureActive(profile, wallet, "User");
    if (!goal) throw new Error("Savings goal was not found.");
    if (goal.status === "cancelled") throw new Error("This savings goal is cancelled.");

    const isDeposit = direction === "deposit";
    if (isDeposit && wallet.balance < numericAmount) throw new Error("Insufficient demo balance.");
    if (!isDeposit && goal.current_amount < numericAmount) throw new Error("Insufficient demo savings.");
    if (isDeposit && goal.current_amount + numericAmount > goal.target_amount) throw new Error("Deposit exceeds the remaining target amount.");

    wallet.balance = Number((wallet.balance + (isDeposit ? -numericAmount : numericAmount)).toFixed(2));
    goal.current_amount = Number((goal.current_amount + (isDeposit ? numericAmount : -numericAmount)).toFixed(2));
    if (goal.current_amount >= goal.target_amount) goal.status = "completed";
    if (goal.current_amount < goal.target_amount && goal.status === "completed") goal.status = "active";
    wallet.updated_at = now();

    const tx = {
      id: makeId("tx"),
      transaction_id: makeTransactionId(),
      transaction_type: isDeposit ? "savings_deposit" : "savings_withdrawal",
      sender_wallet_id: isDeposit ? wallet.id : null,
      receiver_wallet_id: isDeposit ? null : wallet.id,
      sender_id: isDeposit ? userId : null,
      receiver_id: isDeposit ? null : userId,
      amount: numericAmount,
      fee: 0,
      total_amount: numericAmount,
      status: "completed",
      reference: goal.title,
      metadata: {
        savings_goal_id: goal.id,
        savings_goal_title: goal.title,
        savings_direction: isDeposit ? "deposit" : "withdrawal",
        note,
        educational_demo: true
      },
      idempotency_key: idempotencyKey || makeId("idem"),
      created_at: now()
    };
    const entry = {
      id: makeId("sge"),
      goal_id: goal.id,
      transaction_id: tx.id,
      entry_type: isDeposit ? "deposit" : "withdrawal",
      amount: numericAmount,
      note,
      created_at: tx.created_at
    };
    state.transactions.unshift(tx);
    state.savings_goal_entries.unshift(entry);
    notify(state, userId, isDeposit ? "Savings deposit completed" : "Savings withdrawal completed", `${goal.title}: ৳${numericAmount}`, "payment_completed");
    audit(state, userId, isDeposit ? "savings_deposit" : "savings_withdrawal", "transactions", tx.id);
    return { goal, entry, transaction: tx };
  });
}

export function adminStats() {
  const state = getState();
  const today = new Date().toISOString().slice(0, 10);
  const todayTransactions = state.transactions.filter((tx) => tx.created_at.slice(0, 10) === today);
  const volume = state.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  return {
    state,
    totalUsers: state.profiles.filter((profile) => profile.role !== "system").length,
    activeUsers: state.profiles.filter((profile) => profile.account_status === "active" && profile.role !== "system").length,
    customers: state.profiles.filter((profile) => profile.role === "customer").length,
    merchants: state.merchants.length,
    agents: state.agents.length,
    transactions: state.transactions.length,
    todayTransactions: todayTransactions.length,
    demoMoneyIn: volume,
    demoMoneyOut: state.transactions.filter((tx) => tx.sender_wallet_id).reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0)
  };
}

export function setAccountStatus(actorId, profileId, status) {
  return withState((state) => {
    const profile = profileById(state, profileId);
    if (!profile) throw new Error("Profile not found.");
    profile.account_status = status;
    profile.updated_at = now();
    audit(state, actorId, "set_account_status", "profiles", profileId, { status });
    return profile;
  });
}

export function resetDemoState(actorId = "usr_admin_zara") {
  resetState();
  const state = getState();
  audit(state, actorId, "reset_demo_data", "system", "demo");
  saveState(state);
}
