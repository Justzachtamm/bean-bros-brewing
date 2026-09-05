const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const { isSelectableFrequency, normalizeFrequency, intervalForFrequency, findCustomerByEmail, isShippingItem } = require("./lib/subscriptions");
const { requireSession } = require("./lib/accounts");

const ACTIONS = new Set(["cancel", "resume", "pause", "unpause", "update-frequency"]);

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
    // The ownership check further down only proves the subscription belongs to
    // the customer looked up by THIS email — so the email itself has to be
    // trustworthy. It now comes from the session token.
    // AUTH: the email is taken from the verified session token, never from the
    // request body. Before this, anyone who knew a customer's address could
    // call this endpoint as them.
    const session = await requireSession(event, headers);
    if (session.error) return session.error;
    const email = session.email;

    const { subscriptionId, itemId, action, frequency } = JSON.parse(event.body || "{}");
    if (!subscriptionId || !itemId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "subscriptionId and itemId are required" }) };
    }
    if (!ACTIONS.has(action)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
    }
    // Only cadences currently on sale may be selected. Legacy cadences still
    // bill correctly on existing subscriptions but can't be switched back to.
    if (action === "update-frequency" && !isSelectableFrequency(frequency)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid frequency" }) };
    }

    const stripe = Stripe(secretKey);
    const customer = await findCustomerByEmail(stripe, email, session.user.stripeCustomerId);
    if (!customer) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "No account found for that email" }) };
    }

    // Ownership check — never trust subscriptionId alone, always confirm it
    // belongs to the customer we just looked up by email.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price.product"],
    });
    const subCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    if (subCustomerId !== customer.id) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Subscription not found" }) };
    }

    const item = subscription.items.data.find((i) => i.id === itemId);
    if (!item || isShippingItem(item)) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "Subscription item not found" }) };
    }

    switch (action) {
      case "cancel": {
        if (subscription.items.data.filter(i => !isShippingItem(i)).length > 1) {
          // One coffee among several on the same subscription — drop just that
          // item rather than cancelling delivery of everything else too.
          await stripe.subscriptions.update(subscriptionId, {
            items: [{ id: itemId, deleted: true }],
            proration_behavior: "none",
          });
        } else {
          // Last (or only) item — cancel at period end so the customer keeps
          // what they already paid for instead of losing it immediately.
          await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
        }
        break;
      }
      case "resume": {
        await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
        break;
      }
      case "pause": {
        // Stripe pauses collection at the subscription level, not per item —
        // if this subscription bundles multiple coffees they pause together.
        await stripe.subscriptions.update(subscriptionId, { pause_collection: { behavior: "void" } });
        break;
      }
      case "unpause": {
        await stripe.subscriptions.update(subscriptionId, { pause_collection: null });
        break;
      }
      case "update-frequency": {
        const canonicalFrequency = normalizeFrequency(frequency);
        const recurring = intervalForFrequency(canonicalFrequency);
        const replacements = [];
        for (const current of subscription.items.data) {
          const productId = typeof current.price.product === "string" ? current.price.product : current.price.product.id;
          const price = await stripe.prices.create({ currency: current.price.currency,
            unit_amount: current.price.unit_amount, recurring, product: productId });
          replacements.push({ id: current.id, price: price.id, quantity: current.quantity });
        }
        await stripe.subscriptions.update(subscriptionId, {
          items: replacements, proration_behavior: "none",
        });
        break;
      }
    }

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Error managing subscription:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
