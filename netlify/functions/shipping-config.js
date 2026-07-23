const { connectLambda } = require("@netlify/blobs");
const { getShippingConfig, saveShippingConfig } = require("./lib/shipping-config");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  if (event.httpMethod === "GET") {
    const config = await getShippingConfig();
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(config),
    };
  }

  if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
    let config;
    try {
      config = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    await saveShippingConfig(config);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, config }),
    };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
