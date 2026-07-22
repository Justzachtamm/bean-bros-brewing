const { getStore } = require("@netlify/blobs");

const STORE_NAME = "orders";
const KEY = "log";

function store() {
  return getStore(STORE_NAME);
}

async function getOrders() {
  const data = await store().get(KEY, { type: "json" });
  return data || [];
}

// Idempotent on order.sessionId — safe to call more than once for the same
// Stripe checkout session (Stripe webhooks can deliver events more than once).
async function addOrder(order) {
  const orders = await getOrders();
  if (orders.some((o) => o.sessionId === order.sessionId)) {
    return orders;
  }
  orders.unshift(order);
  await store().setJSON(KEY, orders);
  return orders;
}

module.exports = { getOrders, addOrder };
