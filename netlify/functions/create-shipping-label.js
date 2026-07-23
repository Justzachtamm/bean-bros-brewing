const { getStore, connectLambda } = require("@netlify/blobs");
const { getOrders, updateOrder } = require("./lib/orders");
const { getShippingConfig } = require("./lib/shipping-config");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const ups = require("./lib/ups");

const LBS_PER_BAG = 0.9;
const BOX_BASE_WEIGHT_LBS = 0.5;

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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "UPS is not configured yet. Add UPS_CLIENT_ID, UPS_CLIENT_SECRET, and UPS_ACCOUNT_NUMBER in Netlify." }),
    };
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
  if (order.trackingNumber) {
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, trackingNumber: order.trackingNumber, alreadyCreated: true }),
    };
  }
  if (!order.shippingAddress) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "This order has no shipping address on file (subscription renewals don't currently capture one)." }) };
  }

  try {
    const config = await getShippingConfig();
    const weightLbs = BOX_BASE_WEIGHT_LBS + order.items.reduce((sum, i) => sum + i.quantity * LBS_PER_BAG, 0);

    const result = await ups.createShipment({
      shipFrom: {
        name: config.shipFromName,
        address: config.shipFromAddress,
        city: config.shipFromCity,
        state: config.shipFromState,
        zip: config.shipFromZip,
      },
      shipTo: {
        name: order.shippingAddress.name || order.customerName,
        address: order.shippingAddress.address,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
      },
      weightLbs,
      serviceCode: "03", // Ground — admin can be given a service picker later if needed
      description: `Order ${order.id}`,
    });

    let labelKey = null;
    if (result.labelBase64) {
      labelKey = `label-${order.id}.png`;
      await getStore("images").set(labelKey, Buffer.from(result.labelBase64, "base64"), {
        metadata: { contentType: "image/png" },
      });
    }

    await updateOrder(order.id, { trackingNumber: result.trackingNumber, labelKey });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, trackingNumber: result.trackingNumber, labelKey }),
    };
  } catch (err) {
    console.error("Error creating UPS shipment:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: err.message }) };
  }
};
