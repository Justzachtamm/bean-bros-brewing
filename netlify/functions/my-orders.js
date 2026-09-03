const { connectLambda } = require("@netlify/blobs");
const { getOrdersByEmail } = require("./lib/orders");
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

    // Filtered and sorted in SQL. The previous version loaded EVERY order in
    // the store into this function and filtered in JS — fine at ten orders,
    // and a memory and latency problem, plus a needless exposure of other
    // customers' data to this process, at ten thousand.
    const mine = await getOrdersByEmail(email);

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
