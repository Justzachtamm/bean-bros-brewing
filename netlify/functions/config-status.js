const { connectLambda } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const ups = require("./lib/ups");

// Reports whether each integration's secrets are set, WITHOUT ever exposing
// the values themselves — just booleans for the admin panel's status dots.
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

  return {
    statusCode: 200,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      upsConfigured: ups.isConfigured(),
    }),
  };
};
