const { checkoutShipping } = require("./lib/shipping-address");
const { snapshot } = require("./lib/accounting");
const businessRecords = require("./lib/business-records");
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
    residential: shippingDetails.residential !== false,
  };
}

async function recordOrder(stripe, { id, sourceId, customerId, customerName, customerEmail, items, total, shippingAddress, shippingService, shippingPackage, accounting }) {
  if (!shippingAddress?.address || !shippingAddress.zip) throw new Error("Shipping address is missing; retry after Checkout is available");
  const recorded=await recordPaidOrder({ id, sessionId: sourceId, customerId: customerId || "",
    date: accounting?.paidAt || new Date().toISOString(), customerName: customerName || "Unknown",
    customerEmail: customerEmail || "", items, total, status: "Paid", shippingAddress,
    extra: { shippingService, shippingPackage, accounting }, trackingNumber: null, labelKey: null });
  if(accounting?.livemode===true&&customerEmail){const care=require('./lib/customer-care');await care.queue('order:'+id,customerEmail,care.message('Your Bean Bros order is confirmed',`Thank you for your order ${id}.\n${items.filter(i=>!i.isShipping).map(i=>i.quantity+' × '+i.name).join('\n')}\nPaid total: $${Number(total).toFixed(2)}. We’ll email you when your package ships.`));}
  await require("./lib/order-notification").notifyOwner({id,sessionId:sourceId,customerName,customerEmail,items,total,shippingAddress,shippingService,accounting});
  return recorded;
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
      await require("./lib/email-consent").recordPaidConsent(session);
      if (session.mode === "payment" && ["paid", "no_payment_required"].includes(session.payment_status)) {
        // One-time orders are recorded here — this event fires once, exactly
        // when the payment succeeds.
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ["data.price.product"],
        });
        if (lineItems.has_more) throw new Error("Checkout has too many lines to record safely");
        await recordOrder(stripe, {
          accounting: snapshot(session, stripeEvent, lineItems.data),
          id: "BB-" + session.id.slice(-8).toUpperCase(),
          sourceId: session.id,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          customerName: session.customer_details?.name,
          customerEmail: session.customer_details?.email,
          items: toOrderItems(lineItems.data),
          total: (session.amount_total || 0) / 100,
          shippingAddress: toShippingAddress(checkoutShipping(session)),
          shippingService: await shippingService(stripe, session),
          shippingPackage: session.metadata?.shipping_package ? JSON.parse(session.metadata.shipping_package) : null,
        });
      } else if (session.mode === "subscription" && session.subscription) {
        // Subscriptions are recorded via invoice.paid instead (fires for the
        // first period AND every renewal, giving one consistent code path;
        // recording an order here too would double-count the first payment).
        // But the shipping address is only ever collected here, once, at
        // checkout — Invoices don't carry it. Stash it on the Subscription's
        // own metadata so every future invoice.paid (including this first
        // one) can read it back.
        const shipping = toShippingAddress(checkoutShipping(session));
        if (shipping) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { shipping_address: JSON.stringify(shipping) },
          });
        }
      }
    }

    // Only signed, paid Checkout events enqueue first-purchase measurement.
    // No browser-return dependency and no duplicate renewal/acquisition events.
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(stripeEvent.type)) {
      const paidSession = stripeEvent.data.object;
      if (paidSession.livemode === true && paidSession.payment_status === 'paid' && paidSession.metadata?.measurement) {
        const lines = await stripe.checkout.sessions.listLineItems(paidSession.id, {limit:100,expand:['data.price.product']});
        if(lines.has_more)throw Error('Too many measurement lines');
        await require('./lib/conversions').enqueue(paidSession,lines.data,stripeEvent);
      }
    }

    if (["refund.created", "refund.updated", "refund.failed"].includes(stripeEvent.type)) {
      const r = await stripe.refunds.retrieve(stripeEvent.data.object.id);
      await businessRecords.save("refund", r.id, { amount: r.amount, currency: r.currency, status: r.status, livemode: r.livemode, paymentIntent: typeof r.payment_intent === "string" ? r.payment_intent : r.payment_intent?.id, date: new Date(r.created * 1000).toISOString(), taxAdjustment: null });
    }

    if(stripeEvent.livemode===true&&stripeEvent.type==='invoice.payment_failed'){
      const invoice=await stripe.invoices.retrieve(stripeEvent.data.object.id,{expand:['customer']});const customer=invoice.customer;
      if(customer?.email){const care=require('./lib/customer-care');await care.queue('payment-failed:'+invoice.id+':'+invoice.attempt_count,customer.email,care.message('Your Bean Bros payment needs attention','We could not collect the latest subscription payment. Update your payment method in your account. No payment details are requested by email.'));}
    }
    if(stripeEvent.livemode===true&&['refund.created','refund.updated'].includes(stripeEvent.type)){
      const refund=await stripe.refunds.retrieve(stripeEvent.data.object.id);if(refund.status==='succeeded'&&refund.charge){const charge=await stripe.charges.retrieve(typeof refund.charge==='string'?refund.charge:refund.charge.id);const to=charge.billing_details?.email;if(to){const care=require('./lib/customer-care');await care.queue('refund:'+refund.id,to,care.message('Your Bean Bros refund was processed',`We issued a refund of $${(refund.amount/100).toFixed(2)} to your original payment method. Your bank determines when it appears on your statement.`));}}
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
        shippingAddress = toShippingAddress(checkout ? checkoutShipping(checkout) : null);
        // Read Checkout directly: Stripe may deliver invoice.paid before checkout.session.completed.
      }
      if (invoice.lines.has_more) throw new Error("Invoice has too many lines to fulfill safely");
      await recordOrder(stripe, {
        accounting: snapshot(invoice, stripeEvent, invoice.lines.data, true),
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
