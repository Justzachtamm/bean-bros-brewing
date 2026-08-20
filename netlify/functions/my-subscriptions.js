const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const { findCustomerByEmail, listCustomerSubscriptionItems } = require("./lib/subscriptions");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Payments are not configured on the server yet." }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email || typeof email !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
    }

    const stripe = Stripe(secretKey);
    const customer = await findCustomerByEmail(stripe, email);
    if (!customer) {
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ subscriptions: [] }),
      };
    }

    const subscriptions = await listCustomerSubscriptionItems(stripe, customer.id);

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ subscriptions }),
    };
  } catch (err) {
    console.error("Error listing customer subscriptions:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
