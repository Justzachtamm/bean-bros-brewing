const { connectLambda } = require("@netlify/blobs");
const { getOrders } = require("./lib/orders");
const { getProducts } = require("./lib/products");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

  const [orders, products] = await Promise.all([getOrders(), getProducts()]);

  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const recentOrders = orders.filter((o) => new Date(o.date).getTime() >= cutoff);
  const revenue30d = recentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrderValue = recentOrders.length ? revenue30d / recentOrders.length : 0;
  const activeProducts = products.filter((p) => p.active).length;

  return {
    statusCode: 200,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      revenue30d,
      orderCount30d: recentOrders.length,
      avgOrderValue,
      activeProducts,
      recentOrders: orders.slice(0, 20),
    }),
  };
};
