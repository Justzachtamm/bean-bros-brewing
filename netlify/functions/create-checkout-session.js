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
const { getPackageDetails, getShippingOptions } = require("./lib/shipping-rates");

const { taxCode } = require("./lib/accounting");
const businessRecords = require("./lib/business-records");

const { shippingAddress, stripeShipping } = require("./lib/shipping-address");

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
    const { items, successUrl, cancelUrl, shipTo, action, shippingService, shippingAmount, measurement, promoCode, embedded, paymentFirst, emailConsent } = JSON.parse(event.body || "{}");
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "No items in cart" }) };
    }
    if (!["quote","wallet-start","wallet-quote","promo-check"].includes(action) && (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl))) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Invalid redirect URL" }) };
    }

    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    if ((embedded === true || paymentFirst === true || action === 'wallet-start') && action !== 'quote' && (!/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey) || publishableKey.split('_')[1] !== secretKey.split('_')[1])) {
      return {statusCode:503,headers:baseHeaders,body:JSON.stringify({error:'Secure payment is not configured yet. Please contact the store.'})};
    }
    const needsAccount = items.some((item) => item?.isSubscription) || !!(event.headers?.authorization || event.headers?.Authorization);
    const account = needsAccount ? await requireSession(event, baseHeaders) : null;
    if (account?.error) return account.error;
    const items_ = [];
    const taxEnabled = process.env.STRIPE_TAX_ENABLED === "true";
    if (/^(sk|rk)_live_/.test(secretKey) && !taxEnabled) return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: "Checkout is awaiting tax setup. Please contact the store." }) };
    const profiles = taxEnabled ? await businessRecords.list("tax_profile") : [];
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
      const botanical = ['tea','herbs'].includes(product.category);
      const mushroomSubscription = /^(?:neuroshroom|lion[’']?s? mane(?: mushroom(?: powder)?)?|reishi(?: mushroom)?|thrive mode)$/i.test(product.name.trim());
      if(botanical && isSubscription && !mushroomSubscription)throw new Error('Herbs and teas are available as one-time purchases.');
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
      const price = isSubscription && !botanical
        ? Math.round(product.price * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100
        : product.price;
      const grindLabel = botanical ? product.weight || 'As packaged' : grindLabels[item.grind] || Object.values(grindLabels).find((label) => label === item.grindLabel);
      if (!grindLabel) throw new Error("Select a valid grind.");
      items_.push({
        productId: product.id,
        weight: product.weight,
        shippingCategory: product.category || "coffee",
        category: profiles.find(p => p.id === String(product.id))?.body.category || product.category || "coffee",
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
    if (taxEnabled && !["wallet-start","promo-check"].includes(action)) {
      const settings = await stripe.tax.settings.retrieve();
      let newJerseyActive = false;
      for await (const registration of stripe.tax.registrations.list({status:"active",limit:100})) {
        if (registration.country === "US" && registration.country_options?.us?.state === "NJ") newJerseyActive = true;
      }
      if (settings.status !== "active" || !newJerseyActive) return { statusCode: 503, headers: baseHeaders, body: JSON.stringify({ error: "Checkout is awaiting tax setup. Please contact the store." }) };
    }
    // grind/frequency go in product_data.metadata (not just the free-text description)
    // so the webhook can reliably read them back later via price.product.metadata,
    // instead of parsing description strings.
    const itemMetadata = (item) => ({
      grind: item.grindLabel,
      product_id: String(item.productId),
      kind: item.category,
      category: item.category,
      ...(taxEnabled ? { tax_code: taxCode(item.category) } : {}),
      subscription: String(item.isSubscription),
      // Stripe metadata values must be strings — one-time items have no cadence.
      frequency: item.frequency || "",
    });
    const line_items = items_.map((item) => ({
      price_data: {
        currency: "usd",
        ...(taxEnabled ? { tax_behavior: "exclusive" } : {}),
        product_data: {
          name: item.name,
          ...(taxEnabled ? { tax_code: taxCode(item.category) } : {}),
          description: `${item.grindLabel}${item.isSubscription ? ` · ${item.frequencyLabel}` : ""}`,
          metadata: itemMetadata(item),
        },
        unit_amount: Math.round(item.price * 100),
        ...(item.isSubscription ? { recurring: intervalForFrequency(item.frequency) } : {}),
      },
      quantity: item.quantity,
    }));

    // Subscription items already ship at SUBSCRIBE_DISCOUNT off — the
    // threshold is evaluated against what's actually being charged today,
    // same as everything else in this checkout.
    const subtotal = items_.reduce((sum, i) => sum + i.price * i.quantity, 0);

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

    if (action === 'promo-check') {
      if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) throw Error('Enter a promo code.');
      const totals = await require('./lib/wallet-quote').walletQuote(stripe,{items:items_,selected:{amountCents:0,displayName:'Shipping'},promoCode,taxEnabled:false,hasSubscription});
      return {statusCode:200,headers:baseHeaders,body:JSON.stringify({code:promoCode.trim().toUpperCase(),discount:totals.discount,subtotal:totals.subtotal})};
    }
    if (action === 'wallet-start') return {statusCode:200,headers:baseHeaders,body:JSON.stringify({publishableKey,amount:Math.round(subtotal*100),currency:'usd',recurring:hasSubscription,frequency:hasSubscription?items_[0].frequency:null,items:items_.map(i=>({name:i.name,amount:Math.round(i.price*100)*i.quantity}))})};
    const shippingConfig = await getShippingConfig();
    const qualifiesForFreeShipping = Number(shippingConfig.freeShipThreshold) > 0 && subtotal >= shippingConfig.freeShipThreshold;
    const destination = shippingAddress(shipTo,{partial:action==='wallet-quote'});
    if (action !== "wallet-quote") await require("./lib/ups").validateAddress(destination);
    const packageDetails = getPackageDetails(items_, shippingConfig);
    let options = await getShippingOptions(destination, packageDetails, shippingConfig, qualifiesForFreeShipping);
    if (hasSubscription) options = options.filter(o => o.serviceCode === "03");
    if (!options.length) throw Error("No shipping services are available for this shipment.");
    if (action === "quote") return { statusCode:200, headers:baseHeaders, body:JSON.stringify({options, recurring:hasSubscription,addressVerified:true}) };
    if (action === 'wallet-quote') {
      const selected=options.find(o=>o.serviceCode===shippingService)||options[0];
      const totals=await require('./lib/wallet-quote').walletQuote(stripe,{items:items_,destination,selected,promoCode,taxEnabled,hasSubscription});
      return {statusCode:200,headers:baseHeaders,body:JSON.stringify({...totals,options,selectedService:selected.serviceCode,recurring:hasSubscription})};
    }
    const selected = options.find(o => o.serviceCode === shippingService);
    if (!selected || selected.amountCents !== shippingAmount) return {statusCode:409,headers:baseHeaders,body:JSON.stringify({error:"Shipping rates changed. Please get updated rates and choose a service."})};

    let mode = "payment";
    let sessionLineItems = line_items;
    if (hasSubscription && !hasOneTime) {
      mode = "subscription";
      // Quote Ground for the first shipment and disclose the same recurring
      // shipping amount for this subscription; future carrier rates can vary.
      if (!qualifiesForFreeShipping) {
        line_items.push({
          price_data: {
            currency: "usd",
        ...(taxEnabled ? { tax_behavior: "exclusive" } : {}),
            product_data: { name: "Shipping", ...(taxEnabled ? { tax_code: "txcd_92010001" } : {}), metadata: { kind: "shipping", service_code: "03" } },
            unit_amount: selected.amountCents,
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
        ...(taxEnabled ? { tax_behavior: "exclusive" } : {}),
          product_data: {
            name: item.name,
          ...(taxEnabled ? { tax_code: taxCode(item.category) } : {}),
            description: item.grindLabel,
            metadata: itemMetadata(item),
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
    }

    // Re-rate the exact destination and cart on the server before payment.
    let shipping_options;
    if (mode === "payment") {
      shipping_options = [selected].map((o) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          ...(taxEnabled ? { tax_behavior: "exclusive", tax_code: "txcd_92010001" } : {}),
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

    let promotionId;
    if (promoCode) {
      if (hasSubscription) throw Error('Promo codes apply to one-time purchases. Subscriptions already receive 10% off.');
      if (typeof promoCode !== 'string' || !/^[A-Za-z0-9]{3,30}$/.test(promoCode.trim())) throw Error('Enter a valid promo code.');
      const matches = await stripe.promotionCodes.list({code:promoCode.trim(),active:true,limit:1});
      const promotion = matches.data[0];
      if (!promotion || !promotion.coupon.valid || (promotion.expires_at && promotion.expires_at <= Date.now()/1000) || (promotion.max_redemptions && promotion.times_redeemed >= promotion.max_redemptions)) throw Error('This promo code is invalid, expired, or fully redeemed.');
      promotionId = promotion.id;
    }
    const receiptToken = crypto.randomBytes(32).toString("hex");
    const sessionConfig = {
      mode,
      ...(promotionId ? {discounts:[{promotion_code:promotionId}]} : {}),
      ...(taxEnabled ? { automatic_tax: { enabled: true } } : {}),
      metadata: { email_consent: JSON.stringify(require('./lib/email-consent').normalize(emailConsent)), measurement: JSON.stringify(require("./lib/conversions").context(measurement)), receipt_token_hash: crypto.createHash("sha256").update(receiptToken).digest("hex"), fulfillment_version: "2", quoted_shipping: JSON.stringify(destination), shipping_package: JSON.stringify(packageDetails) },
      line_items: sessionLineItems,
      ...((embedded === true || paymentFirst === true || action === 'wallet-start')
        ? {ui_mode:paymentFirst === true ? 'custom' : 'embedded', return_url:checkoutSuccessUrl(successUrl)}
        : {success_url:checkoutSuccessUrl(successUrl), cancel_url:cancelUrl}),
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      payment_method_types: ["card"],
    };
    // The shipping address is fixed to the address used for the quote. The
    // customer can return to the bag to edit it and request a fresh quote.
    sessionConfig.custom_text = {submit:{message:`Deliver to: ${destination.name}, ${destination.address}${destination.address2 ? ', '+destination.address2 : ''}, ${destination.city}, ${destination.state} ${destination.zip}. To change delivery details, use Edit delivery before paying.`}};
    // Automatic tax rejects payment_intent_data.shipping. The quoted address
    // is saved on the Customer below for tax and in metadata for fulfillment.
    if (mode === "payment" && !taxEnabled) sessionConfig.payment_intent_data = {shipping:stripeShipping(destination)};
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
      if (taxEnabled) sessionConfig.customer_update = { address: "auto" };
      sessionConfig.client_reference_id = account.user.id;
    }
    if (!sessionConfig.customer) {
      const customer = await stripe.customers.create({name:destination.name,shipping:stripeShipping(destination)});
      sessionConfig.customer = customer.id;
      delete sessionConfig.customer_creation;
    } else {
      await stripe.customers.update(sessionConfig.customer, {shipping:stripeShipping(destination)});
    }
    if (mode === "subscription") {
      sessionConfig.subscription_data = { metadata: { fulfillment_version: "2", shipping_service: "03", shipping_address:JSON.stringify(destination), shipping_package:JSON.stringify(packageDetails) } };
    }
    // Pin the custom Checkout API separately; keep existing webhook/account APIs stable.
    if (paymentFirst === true) {
      delete sessionConfig.custom_text;
      delete sessionConfig.phone_number_collection;
    }
    const session = await stripe.checkout.sessions.create(sessionConfig, paymentFirst === true ? {apiVersion:'2025-09-30.clover'} : undefined);
    return {
      statusCode: 200,
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ...((embedded === true || paymentFirst === true || action === 'wallet-start') ? {clientSecret:session.client_secret,publishableKey} : {url:session.url}), sessionId:session.id,receiptToken }),
    };
  } catch (err) {
    console.error("Stripe Checkout error:", err.message);
    return { statusCode: [422,503].includes(err.status) ? err.status : 400, headers: baseHeaders, body: JSON.stringify({ error: err.message, ...(err.candidates ? {candidates:err.candidates} : {}) }) };
  }
};
