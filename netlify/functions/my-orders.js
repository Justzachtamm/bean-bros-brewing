const { connectLambda } = require("@netlify/blobs");
const { getOrders } = require("./lib/orders");
const { corsHeaders } = require("./lib/cors");
const { requireSession } = require("./lib/accounts");

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
    // AUTH: the email is taken from the verified session token, never from the
    // request body. Before this, anyone who knew a customer's address could
    // call this endpoint as them.
    const session = requireSession(event, headers);
    if (session.error) return session.error;
    const email = session.email;

    const normalized = email;
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
