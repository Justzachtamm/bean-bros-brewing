const crypto = require("crypto");

const ALLOWED_ORIGINS = ["https://beanbrosbrewingco.com", "http://localhost:8888"];
const TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

function corsOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) {
    // still run a comparison of equal length to avoid leaking length via timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.handler = async (event) => {
  const allowOrigin = corsOrigin(event);
  const baseHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: baseHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const expectedPassword = process.env.ADMIN_PASSWORD;
  const tokenSecret = process.env.ADMIN_TOKEN_SECRET;
  if (!expectedPassword || !tokenSecret) {
    console.error("ADMIN_PASSWORD or ADMIN_TOKEN_SECRET is not set in the Netlify environment");
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: "Admin login is not configured on the server." })
    };
  }

  try {
    const { password } = JSON.parse(event.body || "{}");
    if (!safeEqual(password, expectedPassword)) {
      return { statusCode: 401, headers: baseHeaders, body: JSON.stringify({ error: "Invalid password" }) };
    }

    const exp = Date.now() + TOKEN_TTL_MS;
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64");
    const sig = crypto.createHmac("sha256", tokenSecret).update(payload).digest("base64");
    const token = `${payload}.${sig}`;

    return {
      statusCode: 200,
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ token, exp })
    };
  } catch (err) {
    console.error("Admin login error:", err.message);
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Bad request" }) };
  }
};
