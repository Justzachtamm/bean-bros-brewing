const ups = require("./ups");

const LBS_PER_BAG = 0.9; // ~12oz bag + packaging, rough estimate
const BOX_BASE_WEIGHT_LBS = 0.5;
// Standard ground rate charged when the order doesn't clear the admin's
// free-shipping threshold and real UPS rates aren't available (either UPS
// isn't configured, or the caller didn't supply a shipTo to rate against).
// Faster tiers are unaffected by the threshold; only the standard/ground
// tier is ever waived.
const FLAT_GROUND_RATE_CENTS = 799;

const UPS_SERVICE_NAMES = {
  "03": { name: "UPS Ground", minDays: 1, maxDays: 5 },
  "12": { name: "UPS 3 Day Select", minDays: 3, maxDays: 3 },
  "02": { name: "UPS 2nd Day Air", minDays: 2, maxDays: 2 },
  "01": { name: "UPS Next Day Air", minDays: 1, maxDays: 1 },
};

function computeWeightLbs(items) {
  return BOX_BASE_WEIGHT_LBS + items.reduce((sum, i) => sum + i.quantity * LBS_PER_BAG, 0);
}

// Single source of truth for shipping pricing — used by both the live
// quote endpoint (get-shipping-rate.js) shown to the customer while they
// type their address, and the final checkout charge (create-checkout-session.js).
// They must never compute this differently, or the price shown could
// silently diverge from the price charged.
//
// Returns [{ serviceCode, displayName, amountCents, minDays, maxDays }] —
// serviceCode is "flat" for the no-UPS/no-shipTo fallback tier.
async function getShippingOptions(shipTo, weightLbs, shippingConfig, qualifiesForFreeShipping) {
  if (shipTo && ups.isConfigured()) {
    try {
      const rates = await ups.getRates({
        shipFrom: {
          name: shippingConfig.shipFromName,
          address: shippingConfig.shipFromAddress,
          city: shippingConfig.shipFromCity,
          state: shippingConfig.shipFromState,
          zip: shippingConfig.shipFromZip,
        },
        shipTo,
        weightLbs,
      });
      if (rates.length) {
        // UPS's Shop response can list the same serviceCode more than once
        // (e.g. published vs. negotiated pricing) — keep the cheaper one per
        // code so the customer doesn't see the same tier listed twice.
        const cheapestByCode = new Map();
        for (const r of rates) {
          const existing = cheapestByCode.get(r.serviceCode);
          if (!existing || r.amount < existing.amount) cheapestByCode.set(r.serviceCode, r);
        }
        return [...cheapestByCode.values()].map((r) => {
          const meta = UPS_SERVICE_NAMES[r.serviceCode] || { name: `UPS Service ${r.serviceCode}`, minDays: 1, maxDays: 7 };
          const minDays = r.transitDays ?? meta.minDays;
          const maxDays = r.transitDays ?? meta.maxDays;
          // Only the standard Ground tier is ever waived by the free-shipping
          // threshold — faster tiers always cost their real rate.
          const isGround = r.serviceCode === "03";
          const waived = isGround && qualifiesForFreeShipping;
          return {
            serviceCode: r.serviceCode,
            displayName: waived ? `${meta.name} (Free)` : meta.name,
            amountCents: waived ? 0 : Math.round(r.amount * 100),
            minDays,
            maxDays,
          };
        });
      }
    } catch (err) {
      console.error("UPS rate lookup failed, falling back to flat rates:", err.message);
    }
  }

  const groundAmount = qualifiesForFreeShipping ? 0 : FLAT_GROUND_RATE_CENTS;
  return [
    { serviceCode: "flat", displayName: qualifiesForFreeShipping ? "UPS Ground (Free)" : "UPS Ground", amountCents: groundAmount, minDays: 5, maxDays: 7 },
    { serviceCode: "12", displayName: "UPS 3 Day Select", amountCents: 999, minDays: 3, maxDays: 3 },
    { serviceCode: "02", displayName: "UPS 2nd Day Air", amountCents: 1499, minDays: 2, maxDays: 2 },
    { serviceCode: "01", displayName: "UPS Next Day Air", amountCents: 2499, minDays: 1, maxDays: 1 },
  ];
}

module.exports = { LBS_PER_BAG, BOX_BASE_WEIGHT_LBS, FLAT_GROUND_RATE_CENTS, UPS_SERVICE_NAMES, computeWeightLbs, getShippingOptions };
