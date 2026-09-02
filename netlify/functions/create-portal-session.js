const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders, ALLOWED_ORIGINS } = require("./lib/cors");
const { requireSession } = require("./lib/accounts");

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
    // The URL this returns is a bearer credential into the customer's Stripe
    // billing — payment methods, invoices, cancellation. It must never be
    // mintable from an email address alone.
    // AUTH: the email is taken from the verified session token, never from the
    // request body. Before this, anyone who knew a customer's address could
    // call this endpoint as them.
    const session = requireSession(event, headers);
    if (session.error) return session.error;
    const email = session.email;

    const { returnUrl } = JSON.parse(event.body || "{}");
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
