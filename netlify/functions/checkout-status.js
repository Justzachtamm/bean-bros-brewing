const crypto = require("crypto");
const Stripe = require("stripe");
const { corsHeaders } = require("./lib/cors");
const { getOrderBySource } = require("./lib/orders");

exports.handler = async (event) => {
  const headers = corsHeaders(event, { "Content-Type": "application/json", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" });
  const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const { sessionId, receiptToken } = JSON.parse(event.body || "{}");
    if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]{8,255}$/.test(sessionId) ||
        typeof receiptToken !== "string" || !/^[a-f0-9]{64}$/.test(receiptToken)) {
      return json(400, { error: "This confirmation link is incomplete. Please check your account or confirmation email." });
    }
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const expected = session.metadata?.receipt_token_hash || "";
    const actual = crypto.createHash("sha256").update(receiptToken).digest("hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      return json(403, { error: "This confirmation is not available in this browser. Please check your account or confirmation email." });
    }
    if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) {
      return json(200, { paid: false, status: session.status });
    }
    const source = session.mode === "subscription"
      ? (typeof session.invoice === "string" ? session.invoice : session.invoice?.id) : session.id;
    const order = source ? await getOrderBySource(source) : null;
    // No addresses, email, billing portal URLs or other personal fields.
    return json(200, { paid: true, total: (session.amount_total || 0) / 100,
      currency: session.currency, order: order ? { id: order.id, items: order.items, total: order.total } : null });
  } catch (err) {
    console.error("Checkout status failed:", err.name);
    return json(503, { error: "We could not confirm your payment yet. Please retry; do not place another order." });
  }
};
