const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { getProductByName } = require("./lib/products");
const { corsHeaders, ALLOWED_ORIGINS } = require("./lib/cors");
const { getShippingConfig } = require("./lib/shipping-config");
const { intervalForFrequency } = require("./lib/subscriptions");
const { getPackageDetails, getShippingOptions, FLAT_GROUND_RATE_CENTS } = require("./lib/shipping-rates");

const SUBSCRIBE_DISCOUNT = 0.1;

function isAllowedRedirect(url) {
  return typeof url === "string" && ALLOWED_ORIGINS.some((o) => url.startsWith(o));
}

exports.handler = async (event) => {
  connectLambda(event);
  const baseHeaders = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: baseHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not set in the Netlify environment");
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: "Payments are not configured on the server yet." }),
    };
  }

  try {
    const { items, successUrl, cancelUrl, shipTo, serviceCode } = JSON.parse(event.body || "{}");
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "No items in cart" }) };
    }
    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Invalid redirect URL" }) };
    }

    const items_ = [];
    for (const item of items) {
      const product = await getProductByName(item.name);
      if (!product || !product.active) {
        return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: `Unknown product: ${item.name}` }) };
      }
      const quantity = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      if (quantity > product.stock) {
        return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: `Only ${product.stock} left of ${product.name}` }) };
      }
      const isSubscription = !!item.isSubscription;
      const price = isSubscription
        ? Math.round(product.price * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100
        : product.price;
      items_.push({
        name: product.name,
        grindLabel: String(item.grindLabel || "").slice(0, 40),
        frequencyLabel: String(item.frequencyLabel || "").slice(0, 40),
        frequency: String(item.frequency || "").slice(0, 20),
        isSubscription,
        quantity,
        price,
      });
    }

    const stripe = Stripe(secretKey);
    // grind/frequency go in product_data.metadata (not just the free-text description)
    // so the webhook can reliably read them back later via price.product.metadata,
    // instead of parsing description strings.
    const itemMetadata = (item) => ({
      grind: item.grindLabel,
      subscription: String(item.isSubscription),
      frequency: item.frequency,
    });
    const line_items = items_.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: `${item.grindLabel}${item.isSubscription ? ` · ${item.frequencyLabel}` : ""}`,
          metadata: itemMetadata(item),
        },
        unit_amount: Math.round(item.price * 100),
        ...(item.isSubscription ? { recurring: intervalForFrequency(item.frequency) } : {}),
      },
      quantity: item.quantity,
    }));

    const shippingConfig = await getShippingConfig();
    // Subscription items already ship at SUBSCRIBE_DISCOUNT off — the
    // threshold is evaluated against what's actually being charged today,
    // same as everything else in this checkout.
    const subtotal = items_.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const qualifiesForFreeShipping = subtotal >= (shippingConfig.freeShipThreshold ?? 0);

    const hasSubscription = items_.some((i) => i.isSubscription);
    const hasOneTime = items_.some((i) => !i.isSubscription);
    let mode = "payment";
    let sessionLineItems = line_items;
    if (hasSubscription && !hasOneTime) {
      mode = "subscription";
      // Stripe rejects shipping_options in subscription mode, so recurring
      // shipping has to ride along as its own recurring line item instead —
      // otherwise Subscribe & Save orders ship for $0 forever while the
      // business keeps paying UPS's real cost every renewal. Flat-rate, not
      // live-quoted — UPS doesn't rate future/recurring shipments, only
      // real ones being tendered now. Billed on the same cadence as the
      // subscription itself (mixed-frequency carts use the first item's
      // frequency — Checkout only supports one interval per subscription).
      if (!qualifiesForFreeShipping) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Shipping" },
            unit_amount: FLAT_GROUND_RATE_CENTS,
            recurring: intervalForFrequency(items_[0].frequency),
          },
          quantity: 1,
        });
      }
    } else {
      sessionLineItems = items_.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: `${item.grindLabel}${item.isSubscription ? ` · Subscribe & Save (${item.frequencyLabel})` : ""}`,
            metadata: itemMetadata(item),
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
    }

    // The customer already saw and picked a real, live-quoted rate on our own
    // shipping-address step (see get-shipping-rate.js) — but we never trust a
    // client-supplied price. Re-derive the same options server-side from the
    // same shipTo and match by serviceCode, so what gets charged is always
    // freshly verified, never just echoed back from the client. Only needed
    // in "payment" mode — subscriptions bill shipping as their own flat
    // recurring line item above, not through Stripe's shipping_options.
    let shipping_options;
    if (mode === "payment") {
      if (!shipTo || !serviceCode) {
        return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "A shipping address and selected shipping method are required." }) };
      }
      const packageDetails = getPackageDetails(items_);
      const freshOptions = await getShippingOptions(shipTo, packageDetails, shippingConfig, qualifiesForFreeShipping);
      const chosen = freshOptions.find((o) => o.serviceCode === serviceCode);
      if (!chosen) {
        return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "That shipping method is no longer available — please re-select." }) };
      }
      shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: chosen.amountCents, currency: "usd" },
            display_name: chosen.displayName,
            delivery_estimate: {
              minimum: { unit: "business_day", value: chosen.minDays },
              maximum: { unit: "business_day", value: chosen.maxDays },
            },
          },
        },
      ];
    }

    const sessionConfig = {
      mode,
      line_items: sessionLineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      payment_method_types: ["card"],
    };
    if (mode === "payment" || mode === "subscription") {
      // Subscribe & Save ships product on a recurring basis too, so it needs
      // an address just as much as a one-time order does. Still collected
      // here even when the customer already gave us one on our own shipping
      // step — this is what the order-recording webhook reads
      // (session.shipping_details), so it stays the single source of truth
      // for the address actually saved on the order.
      sessionConfig.shipping_address_collection = { allowed_countries: ["US"] };
    }
    if (mode === "payment") {
      // Stripe rejects shipping_options entirely in subscription mode — a
      // per-checkout shipping-speed picker doesn't apply to a recurring
      // order anyway. Subscribe & Save's shipping is instead billed as its
      // own recurring line item above (or omitted, once the threshold is met).
      sessionConfig.shipping_options = shipping_options;
      // Subscription mode always creates a Customer; one-time purchases don't by
      // default. We force it so every order — recurring or not — is tied to a
      // durable Stripe Customer for the admin Customers view and order history.
      sessionConfig.customer_creation = "always";
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return {
      statusCode: 200,
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error("Stripe Checkout error:", err.message);
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
