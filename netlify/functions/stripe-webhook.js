const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { decrementStock } = require("./lib/products");
const { addOrder } = require("./lib/orders");

// Turns Stripe line items (from a Checkout Session or an Invoice) into our
// internal order-item shape, reading grind/frequency back from the
// product_data.metadata we attached when the price was created — not from
// the free-text description, which isn't reliable to parse.
function toOrderItems(lineItems) {
  return lineItems.map((li) => {
    const product = li.price?.product;
    const metadata = (product && typeof product === "object" && product.metadata) || {};
    return {
      name: (product && product.name) || li.description || "Unknown item",
      grind: metadata.grind || "",
      isSubscription: metadata.subscription === "true",
      frequency: metadata.frequency || "",
      quantity: li.quantity,
      amount: (li.amount_total ?? li.amount ?? 0) / 100,
    };
  });
}

function toShippingAddress(shippingDetails) {
  if (!shippingDetails?.address) return null;
  const a = shippingDetails.address;
  return {
    name: shippingDetails.name || "",
    address: a.line1 || "",
    address2: a.line2 || "",
    city: a.city || "",
    state: a.state || "",
    zip: a.postal_code || "",
    country: a.country || "US",
  };
}

async function recordOrder(stripe, { id, sourceId, customerId, customerName, customerEmail, items, total, shippingAddress }) {
  await decrementStock(items);
  await addOrder({
    id,
    sessionId: sourceId, // idempotency key — a checkout session id or an invoice id, either way unique per charge
    customerId: customerId || "",
    date: new Date().toISOString(),
    customerName: customerName || "Unknown",
    customerEmail: customerEmail || "",
    items,
    total,
    status: "Paid",
    shippingAddress: shippingAddress || null,
    trackingNumber: null,
    labelKey: null,
  });
}

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

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      if (session.mode === "payment") {
        // One-time orders are recorded here — this event fires once, exactly
        // when the payment succeeds.
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ["data.price.product"],
        });
        await recordOrder(stripe, {
          id: "BB-" + session.id.slice(-8).toUpperCase(),
          sourceId: session.id,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          customerName: session.customer_details?.name,
          customerEmail: session.customer_details?.email,
          items: toOrderItems(lineItems.data),
          total: (session.amount_total || 0) / 100,
          shippingAddress: toShippingAddress(session.shipping_details),
        });
      } else if (session.mode === "subscription" && session.subscription) {
        // Subscriptions are recorded via invoice.paid instead (fires for the
        // first period AND every renewal, giving one consistent code path;
        // recording an order here too would double-count the first payment).
        // But the shipping address is only ever collected here, once, at
        // checkout — Invoices don't carry it. Stash it on the Subscription's
        // own metadata so every future invoice.paid (including this first
        // one) can read it back.
        const shipping = toShippingAddress(session.shipping_details);
        if (shipping) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { shipping_address: JSON.stringify(shipping) },
          });
        }
      }
    }

    if (stripeEvent.type === "invoice.paid") {
      const invoiceStub = stripeEvent.data.object;
      // Re-fetch with expansion — webhook payloads aren't expandable in place.
      const invoice = await stripe.invoices.retrieve(invoiceStub.id, {
        expand: ["lines.data.price.product", "customer", "subscription"],
      });
      const customer = invoice.customer;
      const subscription = invoice.subscription;
      let shippingAddress = null;
      if (subscription && typeof subscription === "object" && subscription.metadata?.shipping_address) {
        try {
          shippingAddress = JSON.parse(subscription.metadata.shipping_address);
        } catch {
          shippingAddress = null;
        }
      }
      await recordOrder(stripe, {
        id: "BB-" + invoice.id.slice(-8).toUpperCase(),
        sourceId: invoice.id,
        customerId: typeof customer === "string" ? customer : customer?.id,
        customerName: typeof customer === "object" ? customer?.name : undefined,
        customerEmail: typeof customer === "object" ? customer?.email : invoice.customer_email,
        items: toOrderItems(invoice.lines.data),
        total: (invoice.amount_paid || 0) / 100,
        shippingAddress,
      });
    }
  } catch (err) {
    console.error(`Error processing ${stripeEvent.type}:`, err.message);
    // 500 so Stripe retries — recordOrder is idempotent per session/invoice id.
    return { statusCode: 500, body: JSON.stringify({ error: "Processing error" }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
