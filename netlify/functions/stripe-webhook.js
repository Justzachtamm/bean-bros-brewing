const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { decrementStock } = require("./lib/products");
const { addOrder } = require("./lib/orders");

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    console.error("STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set");
    return { statusCode: 500, body: JSON.stringify({ error: "Webhook not configured" }) };
  }

  const stripe = Stripe(secretKey);
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid signature" }) };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const items = lineItems.data.map((li) => ({
        name: li.description,
        quantity: li.quantity,
        amount: li.amount_total / 100,
      }));

      await decrementStock(items);
      await addOrder({
        id: "BB-" + session.id.slice(-8).toUpperCase(),
        sessionId: session.id,
        date: new Date().toISOString(),
        customerName: session.customer_details?.name || "Unknown",
        customerEmail: session.customer_details?.email || "",
        items,
        total: (session.amount_total || 0) / 100,
        status: "Paid",
      });
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err.message);
      // Return 500 so Stripe retries — addOrder is idempotent on sessionId,
      // so a retry after a transient failure is safe.
      return { statusCode: 500, body: JSON.stringify({ error: "Processing error" }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
