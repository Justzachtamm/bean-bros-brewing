const { connectLambda, getStore } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { getOrderById } = require("./lib/orders");

exports.handler = async event => {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET))
    return { statusCode: 401, headers, body: "Not authenticated" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: "Method not allowed" };
  try {
    connectLambda(event);
    const order = await getOrderById(event.queryStringParameters?.orderId || "");
    if (!order?.labelKey) return { statusCode: 404, headers, body: "Label not found" };
    const store = getStore(order.labelStore === "shipping-labels" ? "shipping-labels" : "images");
    const data = await store.get(order.labelKey, { type: "arrayBuffer" });
    if (!data) return { statusCode: 404, headers, body: "Label not found" };
    return { statusCode: 200, headers: { ...headers, "Content-Type": "image/png" }, body: Buffer.from(data).toString("base64"), isBase64Encoded: true };
  } catch { return { statusCode: 503, headers, body: "Label temporarily unavailable" }; }
};
