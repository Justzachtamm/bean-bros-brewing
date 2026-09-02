const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const { findCustomerByEmail } = require("./lib/subscriptions");
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
    // Without this, anyone with a customer's email could redirect every one of
    // their upcoming subscription deliveries to another address.
    // AUTH: the email is taken from the verified session token, never from the
    // request body. Before this, anyone who knew a customer's address could
    // call this endpoint as them.
    const session = requireSession(event, headers);
    if (session.error) return session.error;
    const email = session.email;

    const { name, street, city, state, zip } = JSON.parse(event.body || "{}");
    if (!street || !city || !state || !zip) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Street, city, state, and zip are required" }) };
    }

    const stripe = Stripe(secretKey);
    const customer = await findCustomerByEmail(stripe, email);
    if (!customer) {
      // Nothing to sync yet — the account has no Stripe customer until their
      // first checkout. Not an error; the local profile save still succeeds.
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, synced: false }),
      };
    }

    const shippingAddress = {
      name: name || customer.name || "",
      address: street,
      address2: "",
      city,
      state,
      zip,
      country: "US",
    };

    await stripe.customers.update(customer.id, {
      name: shippingAddress.name || undefined,
      shipping: {
        name: shippingAddress.name || customer.email,
        address: {
          line1: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.zip,
          country: shippingAddress.country,
        },
      },
    });

    // Renewal shipping is read from each subscription's own metadata (set at
    // checkout, see stripe-webhook.js) rather than the customer record — push
    // the new address there too so upcoming deliveries actually use it.
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 100 });
    await Promise.all(
      subs.data.map((sub) =>
        stripe.subscriptions.update(sub.id, {
          metadata: { ...sub.metadata, shipping_address: JSON.stringify(shippingAddress) },
        })
      )
    );

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, synced: true, subscriptionsUpdated: subs.data.length }),
    };
  } catch (err) {
    console.error("Error updating account address:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
