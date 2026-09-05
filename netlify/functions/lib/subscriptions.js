// The single source of truth for delivery cadence.
//
// SELECTABLE_FREQUENCIES is what the storefront and the account page may
// offer. LEGACY_INTERVALS additionally covers cadences that are no longer
// sold but may still exist on live subscriptions, so those keep rendering
// and billing correctly instead of silently snapping to a default.
//
// "monthly" means every 4 weeks, matching the customer-facing label
// ("Every 4 weeks"), not a calendar month.
const SELECTABLE_FREQUENCIES = {
  biweekly: { interval: "week", interval_count: 2 },
  monthly: { interval: "week", interval_count: 4 },
};

const LEGACY_INTERVALS = {
  weekly: { interval: "week", interval_count: 1 },
  triweekly: { interval: "week", interval_count: 3 },
};

const FREQUENCY_INTERVALS = { ...SELECTABLE_FREQUENCIES, ...LEGACY_INTERVALS };

// The storefront's frequency picker historically emitted a different
// vocabulary ("2-weeks") than this module's keys ("biweekly"). Nothing
// matched, so intervalForFrequency fell through to its default and EVERY
// new subscription billed every 4 weeks no matter what the customer chose.
// The picker now emits canonical keys; these aliases exist so subscriptions
// created before that fix still resolve to the cadence the customer picked.
const FREQUENCY_ALIASES = {
  "1-week": "weekly",
  "2-weeks": "biweekly",
  "3-weeks": "triweekly",
  "4-weeks": "monthly",
};

const DEFAULT_FREQUENCY = "monthly";

// Maps any historical or current frequency value onto a canonical key.
// Returns null for anything unrecognised so callers can decide whether to
// reject it or fall back — never guess silently.
function normalizeFrequency(frequency) {
  if (typeof frequency !== "string") return null;
  const key = frequency.trim();
  const canonical = FREQUENCY_ALIASES[key] || key;
  return FREQUENCY_INTERVALS[canonical] ? canonical : null;
}

const FREQUENCY_LABELS = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  triweekly: "Every 3 weeks",
  monthly: "Every 4 weeks",
};

// A subscription's REAL cadence is whatever Stripe bills on — price.recurring —
// not what product metadata claims. Those two disagreed for every subscription
// created before the 2026-09-02 cadence fix, so anything customer- or
// operator-facing should read the interval, and metadata only as a fallback.
function labelFromRecurring(recurring) {
  if (!recurring || !recurring.interval) return "";
  const n = recurring.interval_count || 1;
  const unit = recurring.interval;
  if (n === 1) return `Every ${unit}`;
  return `Every ${n} ${unit}s`;
}

function labelForFrequency(frequency) {
  const key = normalizeFrequency(frequency);
  return key ? FREQUENCY_LABELS[key] : "";
}

function isSelectableFrequency(frequency) {
  const key = normalizeFrequency(frequency);
  return !!(key && SELECTABLE_FREQUENCIES[key]);
}

function intervalForFrequency(frequency) {
  const key = normalizeFrequency(frequency);
  return FREQUENCY_INTERVALS[key || DEFAULT_FREQUENCY];
}

async function findCustomerByEmail(stripe, email, customerId = null) {
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    return customer.deleted ? null : customer;
  }
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
function isShippingItem(item) {
  const p = item.price?.product;
  return p?.metadata?.kind === "shipping" || (p?.name === "Shipping" && p?.metadata?.subscription !== "true");
}

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
    for (const item of sub.items.data.filter(item => !isShippingItem(item))) {
      const product = item.price.product;
      const metadata = (product && typeof product === "object" && product.metadata) || {};
      let status = "active";
      if (sub.status === "canceled") status = "cancelled";
      else if (sub.cancel_at_period_end) status = "canceling";
      else if (sub.pause_collection) status = "paused";

      rows.push({
        subscriptionId: sub.id,
        itemId: item.id,
        itemCount: sub.items.data.filter(item => !isShippingItem(item)).length,
        status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        paused: !!sub.pause_collection,
        productName: (product && product.name) || "Unknown item",
        grindLabel: metadata.grind || "",
        frequency: Object.keys(FREQUENCY_INTERVALS).find(key => FREQUENCY_INTERVALS[key].interval === item.price.recurring?.interval && FREQUENCY_INTERVALS[key].interval_count === item.price.recurring?.interval_count) || normalizeFrequency(metadata.frequency) || DEFAULT_FREQUENCY,
        quantity: item.quantity,
        price: (item.price.unit_amount || 0) * (item.quantity || 1) / 100,
        nextDelivery: new Date(sub.current_period_end * 1000).toISOString(),
        shippingAddress,
      });
    }
  }
  return rows;
}

module.exports = {
  isShippingItem,
  FREQUENCY_INTERVALS,
  SELECTABLE_FREQUENCIES,
  FREQUENCY_ALIASES,
  FREQUENCY_LABELS,
  DEFAULT_FREQUENCY,
  labelFromRecurring,
  labelForFrequency,
  normalizeFrequency,
  isSelectableFrequency,
  intervalForFrequency,
  findCustomerByEmail,
  parseShippingAddress,
  listCustomerSubscriptionItems,
};
