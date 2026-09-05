const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const { findCustomerByEmail, listCustomerSubscriptionItems } = require("./lib/subscriptions");
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

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Payments are not configured on the server yet." }) };
  }

  try {
    // AUTH: the email is taken from the verified session token, never from the
    // request body. Before this, anyone who knew a customer's address could
    // call this endpoint as them.
    const session = await requireSession(event, headers);
    if (session.error) return session.error;
    const email = session.email;

    const stripe = Stripe(secretKey);
    const customer = await findCustomerByEmail(stripe, email, session.user.stripeCustomerId);
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
