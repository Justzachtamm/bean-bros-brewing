const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const { labelFromRecurring, labelForFrequency, normalizeFrequency } = require("./lib/subscriptions");

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

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Payments are not configured on the server yet." }),
    };
  }

  const stripe = Stripe(secretKey);

  try {
    // Was status:"active", which HID every past_due subscription — the exact
    // ones worth acting on, because a failed renewal is revenue about to be
    // lost. Fetch everything and drop only the states that are truly over.
    // autoPagingToArray also replaces the old hard limit of 100.
    const all = await stripe.subscriptions
      .list({
        status: "all",
        limit: 100,
        expand: ["data.customer", "data.items.data.price.product"],
      })
      .autoPagingToArray({ limit: 1000 });

    const DEAD = new Set(["canceled", "incomplete_expired"]);
    const live = all.filter((sub) => !DEAD.has(sub.status));

    const upcoming = live.map((sub) => {
      const customer = sub.customer;
      const items = sub.items.data.map((item) => {
        const product = item.price.product;
        const metadata = (product && typeof product === "object" && product.metadata) || {};
        return {
          name: (product && product.name) || "Unknown item",
          grind: metadata.grind || "",
          frequency: normalizeFrequency(metadata.frequency) || "",
          quantity: item.quantity,
          amount: (item.price.unit_amount || 0) / 100,
        };
      });
      // Stripe bills one interval per subscription, so the first item's price
      // carries the real cadence.
      const recurring = sub.items.data[0]?.price?.recurring;
      const billedLabel = labelFromRecurring(recurring);
      const firstProduct = sub.items.data[0]?.price?.product;
      const metaLabel = labelForFrequency(
        firstProduct && typeof firstProduct === "object" ? firstProduct.metadata?.frequency : ""
      );
      // Surfaced deliberately: metadata disagreeing with the billed interval is
      // exactly what the pre-2026-09-02 cadence bug looked like from outside.
      const cadenceMismatch = !!(metaLabel && billedLabel && metaLabel !== billedLabel);

      let state = sub.status;
      if (sub.pause_collection) state = "paused";
      else if (sub.status === "active" && sub.cancel_at_period_end) state = "canceling";

      return {
        id: sub.id,
        customerId: typeof customer === "string" ? customer : customer?.id,
        customerName: typeof customer === "object" ? customer?.name : "",
        customerEmail: typeof customer === "object" ? customer?.email : "",
        items,
        frequencyLabel: billedLabel,
        cadenceMismatch,
        state,
        needsAttention: ["past_due", "unpaid", "incomplete"].includes(state),
        nextBillingDate: new Date(sub.current_period_end * 1000).toISOString(),
        amount: (sub.items.data.reduce((sum, i) => sum + (i.price.unit_amount || 0) * i.quantity, 0)) / 100,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    });

    // Anything needing action floats to the top; the rest by next billing date.
    upcoming.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      return new Date(a.nextBillingDate) - new Date(b.nextBillingDate);
    });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ subscriptions: upcoming }),
    };
  } catch (err) {
    console.error("Error listing subscriptions:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
