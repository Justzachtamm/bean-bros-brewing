const { connectLambda } = require("@netlify/blobs");
const { getOrders } = require("./lib/orders");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  const orders = await getOrders();

  const byKey = new Map();
  for (const order of orders) {
    const key = order.customerEmail || order.customerId || order.customerName || "unknown";
    if (!byKey.has(key)) {
      byKey.set(key, {
        customerId: order.customerId || "",
        name: order.customerName || "Unknown",
        email: order.customerEmail || "",
        orders: [],
        totalSpent: 0,
      });
    }
    const entry = byKey.get(key);
    entry.orders.push(order);
    entry.totalSpent += order.total || 0;
    // Keep the most recent order's name/email as the customer's display info
    if (new Date(order.date) >= new Date(entry.orders[0].date)) {
      entry.name = order.customerName || entry.name;
      entry.email = order.customerEmail || entry.email;
      entry.customerId = order.customerId || entry.customerId;
    }
  }

  const customers = Array.from(byKey.values()).map((c) => ({
    ...c,
    orderCount: c.orders.length,
    orders: c.orders.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
  }));
  customers.sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    statusCode: 200,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ customers }),
  };
};
