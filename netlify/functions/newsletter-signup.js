const { connectLambda } = require("@netlify/blobs");
const { getSubscribers, addSubscriber } = require("./lib/newsletter");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Admin-only export of the subscriber list, same bearer-token scheme as
  // the rest of the admin endpoints (see lib/auth.js).
  if (event.httpMethod === "GET") {
    if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
    }
    const subscribers = await getSubscribers();
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ subscribers }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Please enter a valid email address." }) };
    }
    const { added } = await addSubscriber(email);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, added }),
    };
  } catch (err) {
    console.error("Newsletter signup error:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not save your email right now." }) };
  }
};
