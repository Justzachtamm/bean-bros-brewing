const Stripe = require("stripe");
const crypto = require("crypto");
const { requireSession } = require("./lib/accounts");
const { checkoutCustomer } = require("./lib/customer");
const { isAllowedRedirect, checkoutSuccessUrl } = require("./lib/redirects");
const { connectLambda } = require("@netlify/blobs");
const { getProductByName } = require("./lib/products");
const { corsHeaders } = require("./lib/cors");
const { getShippingConfig } = require("./lib/shipping-config");
const { intervalForFrequency, normalizeFrequency, isSelectableFrequency } = require("./lib/subscriptions");
const { getPackageDetails, getShippingOptions, FLAT_GROUND_RATE_CENTS, REFERENCE_SHIP_TO } = require("./lib/shipping-rates");

const SUBSCRIBE_DISCOUNT = 0.1;

exports.handler = async (event) => {
  connectLambda(event);
  const baseHeaders = corsHeaders(event, { "Cache-Control": "no-store", "Content-Type": "application/json" });

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
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "No items in cart" }) };
    }
    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Invalid redirect URL" }) };
    }

    const needsAccount = items.some((item) => item?.isSubscription) || !!(event.headers?.authorization || event.headers?.Authorization);
    const account = needsAccount ? await requireSession(event, baseHeaders) : null;
    if (account?.error) return account.error;
    const items_ = [];
    const counts = new Map();
    const grindLabels = { "whole-bean": "Whole Bean", espresso: "Espresso", drip: "Drip", "pour-over": "Pour Over", "french-press": "French Press", "cold-brew": "Cold Brew" };
    for (const item of items) {
      if (!item || typeof item.name !== "string") throw new Error("Invalid cart item");
      const product = await getProductByName(item.name);
      if (!product || !product.active) {
        return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: `Unknown product: ${item.name}` }) };
      }
      const quantity = item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) throw new Error("Quantity must be between 1 and 50.");
      const combined = (counts.get(product.id) || 0) + quantity;
      counts.set(product.id, combined);
      if (combined > product.stock) {
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
      const grindLabel = grindLabels[item.grind] || Object.values(grindLabels).find((label) => label === item.grindLabel);
      if (!grindLabel) throw new Error("Select a valid grind.");
      items_.push({
        productId: product.id,
        name: product.name,
        grindLabel,
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
      product_id: String(item.productId),
      kind: "coffee",
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
            product_data: { name: "Shipping", metadata: { kind: "shipping", service_code: "03" } },
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
          metadata: { service_code: o.serviceCode },
          delivery_estimate: {
            minimum: { unit: "business_day", value: o.minDays },
            maximum: { unit: "business_day", value: o.maxDays },
          },
        },
      }));
    }

    const receiptToken = crypto.randomBytes(32).toString("hex");
    const sessionConfig = {
      mode,
      metadata: { receipt_token_hash: crypto.createHash("sha256").update(receiptToken).digest("hex"), fulfillment_version: "2" },
      line_items: sessionLineItems,
      success_url: checkoutSuccessUrl(successUrl),
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

    if (account) {
      sessionConfig.customer = await checkoutCustomer(stripe, account.user);
      delete sessionConfig.customer_creation;
      sessionConfig.client_reference_id = account.user.id;
    }
    if (mode === "subscription") {
      sessionConfig.subscription_data = { metadata: { fulfillment_version: "2", shipping_service: "03" } };
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return {
      statusCode: 200,
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id, receiptToken }),
    };
  } catch (err) {
    console.error("Stripe Checkout error:", err.message);
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
