const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { getProductByName } = require("./lib/products");
const { corsHeaders, ALLOWED_ORIGINS } = require("./lib/cors");
const { getShippingConfig } = require("./lib/shipping-config");
const { intervalForFrequency, normalizeFrequency, isSelectableFrequency } = require("./lib/subscriptions");
const { getPackageDetails, getShippingOptions, FLAT_GROUND_RATE_CENTS, REFERENCE_SHIP_TO } = require("./lib/shipping-rates");

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
    const { items, successUrl, cancelUrl } = JSON.parse(event.body || "{}");
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
      // Never take the client's spelling on trust. An unrecognised cadence
      // used to fall through to a silent 4-week default, so a customer could
      // be billed on a schedule they never chose; reject it loudly instead.
      let frequency = null;
      if (isSubscription) {
        if (!isSelectableFrequency(item.frequency)) {
          return {
            statusCode: 400,
            headers: baseHeaders,
            body: JSON.stringify({ error: `Unsupported delivery frequency for ${product.name}.` }),
          };
        }
        frequency = normalizeFrequency(item.frequency);
      }
      const price = isSubscription
        ? Math.round(product.price * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100
        : product.price;
      items_.push({
        name: product.name,
        grindLabel: String(item.grindLabel || "").slice(0, 40),
        frequencyLabel: String(item.frequencyLabel || "").slice(0, 40),
        frequency,
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
      // Stripe metadata values must be strings — one-time items have no cadence.
      frequency: item.frequency || "",
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

    // A Stripe Checkout Session is either "payment" or "subscription" — it
    // cannot be both. A mixed cart used to fall into "payment" mode, which
    // charged the subscribe-and-save discount and displayed "Subscribe &
    // Save" on the line item while creating NO subscription at all. The
    // customer paid a subscriber price for a single delivery that never
    // repeated. Refuse the cart instead.
    if (hasSubscription && hasOneTime) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({
          error: "Subscriptions and one-time items have to be checked out separately. Please place them as two orders.",
        }),
      };
    }

    // Stripe allows exactly one billing interval per subscription, so a cart
    // mixing cadences cannot be honoured either. This used to bill every
    // item on the FIRST item's cadence without telling anyone.
    if (hasSubscription) {
      const cadences = new Set(items_.map((i) => i.frequency));
      if (cadences.size > 1) {
        return {
          statusCode: 400,
          headers: baseHeaders,
          body: JSON.stringify({
            error: "All items in one subscription must share the same delivery frequency. Please check out each frequency separately.",
          }),
        };
      }
    }

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
      // subscription itself (guaranteed uniform by the cadence check above).
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
      // Reached only when every item is one-time (mixed carts are rejected
      // above), so no subscription framing belongs on these line items.
      sessionLineItems = items_.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: item.grindLabel,
            metadata: itemMetadata(item),
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
    }

    // Address is collected on Stripe's own hosted page now (its validation/
    // correction applies there), so we don't know the customer's real
    // destination yet when this session is created — Stripe's
    // shipping_options are fixed at creation time regardless. These tiers
    // are still real, live-pulled UPS rates, just computed against a fixed
    // reference destination rather than each customer's exact address. Only
    // needed in "payment" mode — subscriptions bill shipping as their own
    // flat recurring line item above, not through Stripe's shipping_options.
    let shipping_options;
    if (mode === "payment") {
      const packageDetails = getPackageDetails(items_);
      const options = await getShippingOptions(REFERENCE_SHIP_TO, packageDetails, shippingConfig, qualifiesForFreeShipping);
      shipping_options = options.map((o) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: o.amountCents, currency: "usd" },
          display_name: o.displayName,
          delivery_estimate: {
            minimum: { unit: "business_day", value: o.minDays },
            maximum: { unit: "business_day", value: o.maxDays },
          },
        },
      }));
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
      // Stripe's own hosted-page address form — includes its own
      // validation/correction. This is the only place the customer enters
      // their address; it's also what the order-recording webhook reads
      // (session.shipping_details), so it's the single source of truth for
      // the address actually saved on the order.
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
