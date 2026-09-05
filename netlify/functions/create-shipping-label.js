const { getStore, connectLambda } = require("@netlify/blobs");
const { getOrderById, updateOrder, claimLabel } = require("./lib/orders");
const { getShippingConfig } = require("./lib/shipping-config");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const ups = require("./lib/ups");
const Stripe = require("stripe");
const { shippingService } = require("./lib/fulfillment");
const { getPackageDetails } = require("./lib/shipping-rates");

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

  const order = await getOrderById(orderId);
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
  if (!order.shippingService && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      if (order.sessionId.startsWith("cs_")) {
        order.shippingService = await shippingService(stripe, await stripe.checkout.sessions.retrieve(order.sessionId));
      } else if (order.sessionId.startsWith("in_")) {
        const invoice = await stripe.invoices.retrieve(order.sessionId, { expand: ["subscription"] });
        if (invoice.subscription) order.shippingService = invoice.subscription.metadata?.shipping_service || "03";
      }
      if (order.shippingService) await updateOrder(order.id, { shippingService: order.shippingService });
    } catch { /* Fail closed instead of silently downgrading a paid service. */ }
  }
  if (!order.shippingService || !/^\d{2}$/.test(order.shippingService)) {
    return { statusCode: 409, headers, body: JSON.stringify({ error: "Shipping service is not recorded. Confirm the service paid for in Stripe before creating this label." }) };
  }
  const claimed = await claimLabel(order.id);
  if (!claimed) return { statusCode: 409, headers, body: JSON.stringify({ error: "A label attempt already exists. Check UPS and the order before retrying to avoid a duplicate charge." }) };

  try {
    const config = await getShippingConfig();
    const packageDetails = getPackageDetails(order.items.filter(item => !item.isShipping));

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
        address2: order.shippingAddress.address2,
        country: order.shippingAddress.country || "US",
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
      },
      weightLbs: packageDetails.weightLbs,
      packagingCode: packageDetails.packagingCode,
      dimensions: packageDetails.dimensions,
      serviceCode: order.shippingService,
      description: `Order ${order.id}`,
    });

    let labelKey = null;
    if (result.labelBase64) {
      labelKey = `label-${order.id}.png`;
      await getStore("shipping-labels").set(labelKey, Buffer.from(result.labelBase64, "base64"), {
        metadata: { contentType: "image/png" },
      });
    }

    await updateOrder(order.id, { trackingNumber: result.trackingNumber, labelKey, shipmentId: result.shipmentId, labelStore: "shipping-labels", labelCreationStartedAt: null });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, trackingNumber: result.trackingNumber, labelKey }),
    };
  } catch (err) {
    console.error("Error creating UPS shipment:", err.message);
    // Keep the claim: a timeout does not prove UPS did not create a shipment.
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Label creation could not be confirmed. Check UPS before retrying; a shipment may already exist." }) };
  }
};
