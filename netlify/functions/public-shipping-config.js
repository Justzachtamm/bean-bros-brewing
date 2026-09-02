const { connectLambda } = require("@netlify/blobs");
const { getShippingConfig } = require("./lib/shipping-config");
const { corsHeaders } = require("./lib/cors");

// Public, read-only view of the shipping config.
//
// The storefront needs to tell customers the real free-shipping threshold
// (the admin can change it), but the full config in Netlify Blobs also holds
// the warehouse's ship-from name, street address, city and ZIP. None of that
// belongs in a page anyone can view-source, so this endpoint deliberately
// projects a single field rather than returning the stored object.
//
// The authenticated admin endpoint (shipping-config) remains the only way to
// read the rest or to write anything.
exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const config = await getShippingConfig();
    const threshold = Number(config.freeShipThreshold);
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        // Short cache: the storefront reads this on every page load, but the
        // threshold changes rarely and a stale minute is harmless.
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({
        freeShipThreshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 40,
      }),
    };
  } catch (err) {
    console.error("Error reading public shipping config:", err.message);
    // Never fail the storefront over this — the client falls back to its own
    // default when the field is missing.
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({}),
    };
  }
};
