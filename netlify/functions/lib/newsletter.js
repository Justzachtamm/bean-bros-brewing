const { getStore } = require("@netlify/blobs");

const STORE_NAME = "newsletter";
const KEY = "subscribers";

function store() {
  return getStore(STORE_NAME);
}

async function getSubscribers() {
  const data = await store().get(KEY, { type: "json" });
  return data || [];
}

// Idempotent on email — resubmitting the same address just no-ops instead of
// creating a duplicate row.
async function addSubscriber(email) {
  const subscribers = await getSubscribers();
  const normalized = email.toLowerCase().trim();
  if (subscribers.some((s) => s.email === normalized)) {
    return { subscribers, added: false };
  }
  subscribers.unshift({ email: normalized, subscribedAt: new Date().toISOString() });
  await store().setJSON(KEY, subscribers);
  return { subscribers, added: true };
}

module.exports = { getSubscribers, addSubscriber };
