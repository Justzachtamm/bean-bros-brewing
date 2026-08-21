const { connectLambda } = require("@netlify/blobs");
const { getProductByName } = require("./lib/products");
const { getShippingConfig } = require("./lib/shipping-config");
const { corsHeaders } = require("./lib/cors");
const { computeWeightLbs, getShippingOptions } = require("./lib/shipping-rates");

const SUBSCRIBE_DISCOUNT = 0.1;

function validAddress(shipTo) {
  return !!(shipTo && shipTo.address && shipTo.city && shipTo.state && shipTo.zip);
}

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { items, shipTo } = JSON.parse(event.body || "{}");
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No items in cart" }) };
    }
    if (!validAddress(shipTo)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A complete shipping address is required" }) };
    }

    // Never trust client-supplied prices — recompute from the catalog, same
    // as create-checkout-session.js, so a live quote can never diverge from
    // what the customer is actually charged at checkout.
    const items_ = [];
    for (const item of items) {
      const product = await getProductByName(item.name);
      if (!product || !product.active) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown product: ${item.name}` }) };
      }
      const quantity = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      const isSubscription = !!item.isSubscription;
      const price = isSubscription ? Math.round(product.price * (1 - SUBSCRIBE_DISCOUNT) * 100) / 100 : product.price;
      items_.push({ quantity, price });
    }

    const shippingConfig = await getShippingConfig();
    const subtotal = items_.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const qualifiesForFreeShipping = subtotal >= (shippingConfig.freeShipThreshold ?? 0);
    const weightLbs = computeWeightLbs(items_);

    const options = await getShippingOptions(shipTo, weightLbs, shippingConfig, qualifiesForFreeShipping);

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ options, qualifiesForFreeShipping }),
    };
  } catch (err) {
    console.error("Error getting shipping rate:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not calculate shipping right now." }) };
  }
};
