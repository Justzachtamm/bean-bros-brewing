const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { getProductByName } = require("./lib/products");
const { corsHeaders, ALLOWED_ORIGINS } = require("./lib/cors");
const ups = require("./lib/ups");
const { getShippingConfig } = require("./lib/shipping-config");

const SUBSCRIBE_DISCOUNT = 0.1;
const LBS_PER_BAG = 0.9; // ~12oz bag + packaging, rough estimate
const BOX_BASE_WEIGHT_LBS = 0.5;

const UPS_SERVICE_NAMES = {
  "03": { name: "UPS Ground", minDays: 1, maxDays: 5 },
  "12": { name: "UPS 3 Day Select", minDays: 3, maxDays: 3 },
  "02": { name: "UPS 2nd Day Air", minDays: 2, maxDays: 2 },
  "01": { name: "UPS Next Day Air", minDays: 1, maxDays: 1 },
};

function isAllowedRedirect(url) {
  return typeof url === "string" && ALLOWED_ORIGINS.some((o) => url.startsWith(o));
}

// Real UPS-calculated rates when we know the destination and UPS is
// configured; otherwise the flat-rate fallback that shipped before UPS
// credentials existed. shipTo is optional in the request body — the
// client doesn't collect an address before Stripe Checkout today, so
// this only activates once that's wired up client-side too.
async function buildShippingOptions(shipTo, totalWeightLbs) {
  if (shipTo && ups.isConfigured()) {
    try {
      const config = await getShippingConfig();
      const rates = await ups.getRates({
        shipFrom: {
          name: config.shipFromName,
          address: config.shipFromAddress,
          city: config.shipFromCity,
          state: config.shipFromState,
          zip: config.shipFromZip,
        },
        shipTo,
        weightLbs: totalWeightLbs,
      });
      if (rates.length) {
        return rates.map((r) => {
          const meta = UPS_SERVICE_NAMES[r.serviceCode] || { name: `UPS Service ${r.serviceCode}`, minDays: 1, maxDays: 7 };
          // Real transit time from UPS when the API gave us one; otherwise
          // fall back to the static per-service estimate.
          const minDays = r.transitDays ?? meta.minDays;
          const maxDays = r.transitDays ?? meta.maxDays;
          return {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: Math.round(r.amount * 100), currency: "usd" },
              display_name: meta.name,
              delivery_estimate: {
                minimum: { unit: "business_day", value: minDays },
                maximum: { unit: "business_day", value: maxDays },
              },
            },
          };
        });
      }
    } catch (err) {
      console.error("UPS rate lookup failed, falling back to flat rates:", err.message);
    }
  }

  return [
    { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "UPS Ground (Free)", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 7 } } } },
    { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 999, currency: "usd" }, display_name: "UPS 3 Day Select", delivery_estimate: { minimum: { unit: "business_day", value: 3 }, maximum: { unit: "business_day", value: 3 } } } },
    { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 1499, currency: "usd" }, display_name: "UPS 2nd Day Air", delivery_estimate: { minimum: { unit: "business_day", value: 2 }, maximum: { unit: "business_day", value: 2 } } } },
    { shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 2499, currency: "usd" }, display_name: "UPS Next Day Air", delivery_estimate: { minimum: { unit: "business_day", value: 1 }, maximum: { unit: "business_day", value: 1 } } } },
  ];
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
    const { items, successUrl, cancelUrl, shipTo } = JSON.parse(event.body || "{}");
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
        ...(item.isSubscription
          ? { recurring: { interval: item.frequency === "weekly" ? "week" : "month", interval_count: 1 } }
          : {}),
      },
      quantity: item.quantity,
    }));

    const hasSubscription = items_.some((i) => i.isSubscription);
    const hasOneTime = items_.some((i) => !i.isSubscription);
    let mode = "payment";
    let sessionLineItems = line_items;
    if (hasSubscription && !hasOneTime) {
      mode = "subscription";
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

    const totalWeightLbs = BOX_BASE_WEIGHT_LBS + items_.reduce((sum, i) => sum + i.quantity * LBS_PER_BAG, 0);
    const shipping_options = await buildShippingOptions(shipTo, totalWeightLbs);

    const sessionConfig = {
      mode,
      line_items: sessionLineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      payment_method_types: ["card"],
    };
    if (mode === "payment") {
      sessionConfig.shipping_address_collection = { allowed_countries: ["US"] };
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
