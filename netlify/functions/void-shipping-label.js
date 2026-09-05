const { getStore, connectLambda } = require("@netlify/blobs");
const { getOrders, updateOrder } = require("./lib/orders");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const ups = require("./lib/ups");

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
  if (!ups.isConfigured()) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "UPS is not configured yet." }) };
  }

  let orderId;
  try {
    ({ orderId } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  if (!orderId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "orderId is required" }) };
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: "Order not found" }) };
  }
  if (!order.shipmentId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "This order has no UPS shipment to void (label was created before shipmentId tracking was added, or no label exists)." }) };
  }

  try {
    await ups.voidShipment({ shipmentId: order.shipmentId, trackingNumber: order.trackingNumber });

    if (order.labelKey) {
      await getStore(order.labelStore === "shipping-labels" ? "shipping-labels" : "images").delete(order.labelKey).catch(() => {});
    }
    await updateOrder(order.id, { trackingNumber: null, labelKey: null, shipmentId: null });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Error voiding UPS shipment:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: err.message }) };
  }
};
