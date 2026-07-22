const crypto = require("crypto");
const { getStore, connectLambda } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 4 * 1024 * 1024; // 4MB raw — keeps the base64 request/response well under Netlify's 6MB function payload limit

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { productId, imageBase64, contentType } = body;
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unsupported image type. Use JPEG, PNG, WEBP, or GIF." }) };
  }
  if (typeof imageBase64 !== "string" || !imageBase64) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing image data" }) };
  }

  let buffer;
  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid base64 image data" }) };
  }
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Image must be under ${MAX_BYTES / 1024 / 1024}MB` }) };
  }

  const key = `product-${productId || "new"}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const store = getStore("images");
  await store.set(key, buffer, { metadata: { contentType } });

  return {
    statusCode: 200,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, key }),
  };
};
