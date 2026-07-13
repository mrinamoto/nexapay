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

const Notifications = await import("../js/services/notification-service.js");
const Contacts = await import("../js/services/contact-service.js");
const Wallet = await import("../js/services/wallet-service.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const userId = "usr_customer_ava";

const initialNotifications = await Notifications.listNotifications(userId);
const initialUnread = Notifications.unreadCount(initialNotifications);
const split = Notifications.splitByRead(initialNotifications);

assert(initialNotifications.length >= 4, "Seeded notifications should be available.");
assert(initialUnread >= 2, "Unread count should include seeded unread notifications.");
assert(split.unread.length === initialUnread, "Split unread count should match unreadCount helper.");
assert(split.read.length + split.unread.length === initialNotifications.length, "Split read/unread groups should cover every notification.");

await Notifications.markNotification("ntf_1", userId, true);
let notifications = await Notifications.listNotifications(userId);
assert(notifications.find((item) => item.id === "ntf_1")?.is_read === true, "A notification can be marked as read.");

await Notifications.markNotification("ntf_1", userId, false);
notifications = await Notifications.listNotifications(userId);
assert(notifications.find((item) => item.id === "ntf_1")?.is_read === false, "A notification can be marked as unread.");

await Notifications.markAllNotifications(userId);
notifications = await Notifications.listNotifications(userId);
assert(Notifications.unreadCount(notifications) === 0, "Mark all should clear unread notifications.");

await Notifications.deleteNotification("ntf_4", userId);
notifications = await Notifications.listNotifications(userId);
assert(!notifications.some((item) => item.id === "ntf_4"), "Users can delete their own notification.");

const favorites = await Contacts.listFavorites(userId);
assert(favorites.length >= 4, "Seeded favorite contacts should be listed.");
assert(favorites.some((item) => item.profile.full_name === "Sami Karim"), "Favorite rows should include safe profile fields.");

const recent = await Contacts.listRecentContacts(userId);
assert(recent.some((contact) => contact.id === "usr_customer_sami"), "Recent contacts should include transaction counterparties.");
assert(recent.every((contact) => contact.id !== userId), "Recent contacts should never include the current user.");

const searchResults = await Contacts.searchContacts("Mira", userId);
assert(searchResults.some((contact) => contact.id === "usr_agent_mira"), "Contact search should find fictional demo agents.");
assert(searchResults.every((contact) => contact.id !== userId), "Contact search should exclude the current profile.");

await Contacts.addFavorite(userId, "usr_agent_mira");
let updatedFavorites = await Contacts.listFavorites(userId);
assert(updatedFavorites.some((item) => item.favorite_user_id === "usr_agent_mira"), "Users can add a favorite contact.");

await Contacts.removeFavorite(userId, "usr_agent_mira");
updatedFavorites = await Contacts.listFavorites(userId);
assert(!updatedFavorites.some((item) => item.favorite_user_id === "usr_agent_mira"), "Users can remove a favorite contact.");

const state = Wallet.getDashboardData(userId).state;
assert(!state.favorites.some((item) => item.user_id === userId && item.favorite_user_id === userId), "Favorites should not allow self-contact records.");

console.log("Phase 14 smoke test passed: notifications, unread state, deletion, recent contacts, search, and favorites are correct.");
