const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { recordPaidOrder } = require("./lib/orders");
const { isShippingItem } = require("./lib/subscriptions");
const { shippingService } = require("./lib/fulfillment");

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
      productId: metadata.product_id || null,
      isShipping: isShippingItem(li),
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

async function recordOrder(stripe, { id, sourceId, customerId, customerName, customerEmail, items, total, shippingAddress, shippingService }) {
  if (!shippingAddress?.address || !shippingAddress.zip) throw new Error("Shipping address is missing; retry after Checkout is available");
  return recordPaidOrder({ id, sessionId: sourceId, customerId: customerId || "",
    date: new Date().toISOString(), customerName: customerName || "Unknown",
    customerEmail: customerEmail || "", items, total, status: "Paid", shippingAddress,
    extra: { shippingService }, trackingNumber: null, labelKey: null });
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
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(stripeEvent.type)) {
      const session = stripeEvent.data.object;
      if (session.mode === "payment" && ["paid", "no_payment_required"].includes(session.payment_status)) {
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
          shippingAddress: toShippingAddress(session.shipping_details || session.collected_information?.shipping_details),
          shippingService: await shippingService(stripe, session),
        });
      } else if (session.mode === "subscription" && session.subscription) {
        // Subscriptions are recorded via invoice.paid instead (fires for the
        // first period AND every renewal, giving one consistent code path;
        // recording an order here too would double-count the first payment).
        // But the shipping address is only ever collected here, once, at
        // checkout — Invoices don't carry it. Stash it on the Subscription's
        // own metadata so every future invoice.paid (including this first
        // one) can read it back.
        const shipping = toShippingAddress(session.shipping_details || session.collected_information?.shipping_details);
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
      if (!subscription) return { statusCode: 200, body: JSON.stringify({ received: true }) };
      let shippingAddress = null;
      if (subscription && typeof subscription === "object" && subscription.metadata?.shipping_address) {
        try {
          shippingAddress = JSON.parse(subscription.metadata.shipping_address);
        } catch {
          shippingAddress = null;
        }
      }
      if (!shippingAddress) {
        const subscriptionId = typeof subscription === "string" ? subscription : subscription.id;
        const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 1 });
        const checkout = sessions.data[0];
        shippingAddress = toShippingAddress(checkout?.shipping_details || checkout?.collected_information?.shipping_details);
        // Read Checkout directly: Stripe may deliver invoice.paid before checkout.session.completed.
      }
      if (invoice.lines.has_more) throw new Error("Invoice has too many lines to fulfill safely");
      await recordOrder(stripe, {
        id: "BB-" + invoice.id.slice(-8).toUpperCase(),
        sourceId: invoice.id,
        customerId: typeof customer === "string" ? customer : customer?.id,
        customerName: typeof customer === "object" ? customer?.name : undefined,
        customerEmail: typeof customer === "object" ? customer?.email : invoice.customer_email,
        items: toOrderItems(invoice.lines.data),
        total: (invoice.amount_paid || 0) / 100,
        shippingAddress,
        shippingService: subscription.metadata?.shipping_service || "03",
      });
    }
  } catch (err) {
    console.error(`Error processing ${stripeEvent.type}:`, err.message);
    // 500 so Stripe retries — recordOrder is idempotent per session/invoice id.
    return { statusCode: 500, body: JSON.stringify({ error: "Processing error" }) };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
