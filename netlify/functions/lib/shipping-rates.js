const ups = require("./ups");

const LBS_PER_BAG = 1.2; // ~16oz bag + packaging, rough estimate (scaled up from the 12oz-bag estimate when bag size changed)
const BOX_BASE_WEIGHT_LBS = 0.5;
// Flat recurring shipping fee for Subscribe & Save orders — UPS has no
// concept of a live rate for a shipment that hasn't happened yet, so
// subscriptions are the one place a flat fee is the correct model, not a
// fallback. One-time orders always use a real, live-pulled UPS rate; see
// getShippingOptions below, which throws rather than ever guessing one.
const FLAT_GROUND_RATE_CENTS = 799;

// Stripe rejects a Checkout Session carrying more than five shipping_options
// ("Array shipping_options exceeded maximum 5 allowed elements"), which took
// checkout down entirely for any address where UPS returned six or more
// services. Cap the list here, at the source, so no caller can trip it.
const MAX_SHIPPING_OPTIONS = 5;

const UPS_SERVICE_NAMES = {
  "03": { name: "UPS Ground", minDays: 1, maxDays: 5 },
  "12": { name: "UPS 3 Day Select", minDays: 3, maxDays: 3 },
  "02": { name: "UPS 2nd Day Air", minDays: 2, maxDays: 2 },
  "01": { name: "UPS Next Day Air", minDays: 1, maxDays: 1 },
};

// Address collection now happens entirely on Stripe's hosted checkout page
// (so its own address validation/correction applies), which means we no
// longer know the customer's real destination before creating the session —
// Stripe's shipping_options are fixed at session-creation time and can't be
// recalculated once the customer types their address on Stripe's page.
// Rather than guess a price, these tiers are computed from a REAL UPS rate
// call against a fixed reference destination (a roughly-central, real US
// address), so the numbers are genuine current UPS pricing — just not
// specific to each customer's actual location. Columbus, OH is a reasonable
// stand-in for "typical" US shipping distance from the shop's NJ origin.
const REFERENCE_SHIP_TO = { name: "Reference Destination", address: "175 S 3rd St", city: "Columbus", state: "OH", zip: "43215" };

// A single 16oz bag (1 lb of product) ships in a bubble mailer instead of a
// box — lighter overhead and real physical dimensions, which affects
// dimensional-weight pricing. Two or more bags no longer fit a mailer and go
// in a box (no fixed dimensions — UPS rates it on weight alone, as before).
//
// Packaging code is "02" (Customer Supplied Package) for BOTH cases, not
// UPS's "04" (PAK) for the mailer — confirmed live against UPS's Rating API
// that PAK excludes Ground and 3 Day Select entirely (Air services only),
// which would silently hide the cheapest option from anyone ordering a
// single bag. "02" rates correctly off the given weight/dimensions with the
// full service list available, same as a box.
const MAILER_MAX_BAGS = 1;
const MAILER_WEIGHT_LBS = 1.2; // fixed: one 16oz bag + mailer packaging
const MAILER_DIMENSIONS_IN = { length: "15", width: "12", height: "4" };

function getPackageDetails(items) {
  const totalBags = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalBags <= MAILER_MAX_BAGS) {
    return { weightLbs: MAILER_WEIGHT_LBS, packagingCode: "02", dimensions: MAILER_DIMENSIONS_IN };
  }
  return { weightLbs: BOX_BASE_WEIGHT_LBS + totalBags * LBS_PER_BAG, packagingCode: "02", dimensions: null };
}

// Computes real UPS rate tiers for a given destination (either the fixed
// REFERENCE_SHIP_TO above, for the static picker shown on Stripe's page, or
// a real customer address if a caller ever has one).
//
// Deliberately has NO flat-rate fallback: a customer must never be shown or
// charged a shipping price that wasn't actually pulled from UPS. If UPS is
// unreachable, misconfigured, or returns nothing, this throws — callers are
// expected to surface a clear "rates unavailable, try again" error rather
// than substitute a guessed number.
//
// Returns [{ serviceCode, displayName, amountCents, minDays, maxDays }].
async function getShippingOptions(shipTo, packageDetails, shippingConfig, qualifiesForFreeShipping) {
  if (!shipTo) {
    throw new Error("A shipping address is required to get rates.");
  }
  if (!ups.isConfigured()) {
    throw new Error("Live shipping rates are not available right now.");
  }

  const rates = await ups.getRates({
    shipFrom: {
      name: shippingConfig.shipFromName,
      address: shippingConfig.shipFromAddress,
      city: shippingConfig.shipFromCity,
      state: shippingConfig.shipFromState,
      zip: shippingConfig.shipFromZip,
    },
    shipTo,
    weightLbs: packageDetails.weightLbs,
    packagingCode: packageDetails.packagingCode,
    dimensions: packageDetails.dimensions,
  });
  if (!rates.length) {
    throw new Error("UPS did not return any shipping rates for this address.");
  }

  // Defensive dedupe: keep the cheapest entry per serviceCode so the
  // customer never sees the same tier listed twice. (Note: negotiated vs.
  // published pricing is NOT a duplicate entry — ups.getRates already
  // resolves that per RatedShipment via NegotiatedRateCharges.)
  const cheapestByCode = new Map();
  for (const r of rates) {
    const existing = cheapestByCode.get(r.serviceCode);
    if (!existing || r.amount < existing.amount) cheapestByCode.set(r.serviceCode, r);
  }

  // Trim to Stripe's five-option ceiling.
  //
  // Prefer the four services we have real names and transit estimates for
  // (Ground, 3 Day Select, 2nd Day Air, Next Day Air). UPS also returns codes
  // we have no label for, which would render at checkout as "UPS Service 59"
  // with a guessed 1-7 day estimate — worse for the customer than any named
  // tier, so those are dropped whenever a named one exists rather than used to
  // pad the list to five. Unnamed services are used only if UPS returned
  // nothing else, so a rate is still offered instead of checkout failing.
  //
  // Whatever survives is sorted cheapest-first before the cut, so the customer
  // can never lose the most affordable option to an arbitrary truncation.
  const deduped = [...cheapestByCode.values()];
  const named = deduped.filter((r) => UPS_SERVICE_NAMES[r.serviceCode]);
  const pool = named.length ? named : deduped;
  const chosen = pool.slice().sort((a, b) => a.amount - b.amount).slice(0, MAX_SHIPPING_OPTIONS);

  return chosen.map((r) => {
    const meta = UPS_SERVICE_NAMES[r.serviceCode] || { name: `UPS Service ${r.serviceCode}`, minDays: 1, maxDays: 7 };
    const minDays = r.transitDays ?? meta.minDays;
    const maxDays = r.transitDays ?? meta.maxDays;
    // Only the standard Ground tier is ever waived by the free-shipping
    // threshold — faster tiers always cost their real rate. This is a real
    // UPS rate discounted to $0 by business policy, not a guessed number.
    const isGround = r.serviceCode === "03";
    const waived = isGround && qualifiesForFreeShipping;
    return {
      serviceCode: r.serviceCode,
      displayName: waived ? `${meta.name} (Free)` : meta.name,
      amountCents: waived ? 0 : Math.round(r.amount * 100),
      minDays,
      maxDays,
    };
  })
  // Re-sort AFTER the free-shipping waiver: waiving Ground to $0 can move it
  // below a tier that was cheaper at full price, and Stripe renders these in
  // the order given, so sorting before the waiver would show $0 mid-list.
  .sort((a, b) => a.amountCents - b.amountCents);
}

module.exports = { LBS_PER_BAG, BOX_BASE_WEIGHT_LBS, FLAT_GROUND_RATE_CENTS, MAX_SHIPPING_OPTIONS, UPS_SERVICE_NAMES, REFERENCE_SHIP_TO, getPackageDetails, getShippingOptions };
