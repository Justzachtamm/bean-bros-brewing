const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders, ALLOWED_ORIGINS } = require("./lib/cors");

function isAllowedRedirect(url) {
  return typeof url === "string" && ALLOWED_ORIGINS.some((o) => url.startsWith(o));
}

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
    const { email, returnUrl } = JSON.parse(event.body || "{}");
    if (!email || typeof email !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
    }
    if (!isAllowedRedirect(returnUrl)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid return URL" }) };
    }

    const stripe = Stripe(secretKey);
    const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "No account found for that email" }) };
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ url: portalSession.url }),
    };
  } catch (err) {
    console.error("Error creating portal session:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
