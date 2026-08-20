const { connectLambda } = require("@netlify/blobs");
const { getOrders } = require("./lib/orders");
const { corsHeaders } = require("./lib/cors");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email || typeof email !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
    }

    const normalized = email.toLowerCase().trim();
    const orders = await getOrders();
    const mine = orders
      .filter((o) => (o.customerEmail || "").toLowerCase().trim() === normalized)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ orders: mine }),
    };
  } catch (err) {
    console.error("Error listing customer orders:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not load orders" }) };
  }
};
