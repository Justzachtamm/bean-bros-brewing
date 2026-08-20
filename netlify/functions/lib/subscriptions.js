// Every "frequency" value the frontend offers (weekly/biweekly/triweekly/monthly)
// maps to a week-based interval — "monthly" here means every 4 weeks, matching
// the frontend's own label ("Every 4 weeks"), not a calendar month. Keeping this
// as the single source of truth so checkout and later frequency changes agree.
const FREQUENCY_INTERVALS = {
  weekly: { interval: "week", interval_count: 1 },
  biweekly: { interval: "week", interval_count: 2 },
  triweekly: { interval: "week", interval_count: 3 },
  monthly: { interval: "week", interval_count: 4 },
};

function intervalForFrequency(frequency) {
  return FREQUENCY_INTERVALS[frequency] || FREQUENCY_INTERVALS.monthly;
}

async function findCustomerByEmail(stripe, email) {
  if (!email || typeof email !== "string") return null;
  const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 1 });
  return customers.data[0] || null;
}

function parseShippingAddress(subscription) {
  const raw = subscription.metadata?.shipping_address;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Flattens every item across all of a customer's subscriptions into one row
// per item — a single Stripe Subscription can hold multiple coffees (e.g. two
// different bags subscribed to in the same checkout), and each is shown and
// managed independently in the account UI.
async function listCustomerSubscriptionItems(stripe, customerId) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
    expand: ["data.items.data.price.product"],
  });

  const rows = [];
  for (const sub of subs.data) {
    if (sub.status === "incomplete_expired") continue;
    const shippingAddress = parseShippingAddress(sub);
    for (const item of sub.items.data) {
      const product = item.price.product;
      const metadata = (product && typeof product === "object" && product.metadata) || {};
      let status = "active";
      if (sub.status === "canceled") status = "cancelled";
      else if (sub.cancel_at_period_end) status = "canceling";
      else if (sub.pause_collection) status = "paused";

      rows.push({
        subscriptionId: sub.id,
        itemId: item.id,
        itemCount: sub.items.data.length,
        status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        paused: !!sub.pause_collection,
        productName: (product && product.name) || "Unknown item",
        grindLabel: metadata.grind || "",
        frequency: metadata.frequency || "monthly",
        quantity: item.quantity,
        price: (item.price.unit_amount || 0) / 100,
        nextDelivery: new Date(sub.current_period_end * 1000).toISOString(),
        shippingAddress,
      });
    }
  }
  return rows;
}

module.exports = { FREQUENCY_INTERVALS, intervalForFrequency, findCustomerByEmail, parseShippingAddress, listCustomerSubscriptionItems };
