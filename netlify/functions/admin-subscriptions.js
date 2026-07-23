const Stripe = require("stripe");
const { connectLambda } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Payments are not configured on the server yet." }),
    };
  }

  const stripe = Stripe(secretKey);

  try {
    const subs = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer", "data.items.data.price.product"],
    });

    const upcoming = subs.data.map((sub) => {
      const customer = sub.customer;
      const items = sub.items.data.map((item) => {
        const product = item.price.product;
        const metadata = (product && typeof product === "object" && product.metadata) || {};
        return {
          name: (product && product.name) || "Unknown item",
          grind: metadata.grind || "",
          frequency: metadata.frequency || "",
          quantity: item.quantity,
          amount: (item.price.unit_amount || 0) / 100,
        };
      });
      return {
        id: sub.id,
        customerId: typeof customer === "string" ? customer : customer?.id,
        customerName: typeof customer === "object" ? customer?.name : "",
        customerEmail: typeof customer === "object" ? customer?.email : "",
        items,
        nextBillingDate: new Date(sub.current_period_end * 1000).toISOString(),
        amount: (sub.items.data.reduce((sum, i) => sum + (i.price.unit_amount || 0) * i.quantity, 0)) / 100,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    });

    upcoming.sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ subscriptions: upcoming }),
    };
  } catch (err) {
    console.error("Error listing subscriptions:", err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Could not reach Stripe" }) };
  }
};
