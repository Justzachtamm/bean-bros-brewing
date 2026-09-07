const ups = require("./ups");

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

// Owner-supplied packing rules: catalog net weight plus 8 oz per shipment.
// Bags are stacked on their widest face; dimensions are rounded up for UPS.
function netWeightLbs(label) {
  const m = String(label || '').match(/^(\d+(?:\.\d+)?)\s*(oz|ounces?|lbs?|pounds?|kg|g|grams?)\b/i);
  if (!m || Number(m[1]) <= 0) throw Error("A product needs a valid shipping weight before checkout.");
  const unit=m[2].toLowerCase(), n=Number(m[1]);
  return unit.startsWith('oz')||unit.startsWith('ounce') ? n/16 : unit==='kg' ? n*2.2046226218 : unit==='g'||unit.startsWith('gram') ? n/453.59237 : n;
}
function getPackageDetails(items) {
  let weight=0.5,length=0,width=0,height=0;
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw Error("Invalid shipment quantity.");
    const botanical=['tea','herbs'].includes(item.shippingCategory || item.category);
    const bundle=botanical && /^3 individual bags$/i.test(item.weight || '');
    // These three catalog bundles explicitly list three 1 oz bags.
    if (bundle && ![900002,900003,900004].includes(Number(item.productId))) throw Error("Bundle weight needs confirmation.");
    const net=bundle ? 3/16 : netWeightLbs(item.weight);
    const dims=botanical ? [8,6,0.25*(bundle?3:1)] : net<=0.5 ? [9,6,3] : net<=1 ? [14,6,3] : null;
    if (!dims) throw Error("This product needs packaging dimensions before checkout.");
    weight+=net*item.quantity;length=Math.max(length,dims[0]);width=Math.max(width,dims[1]);height+=dims[2]*item.quantity;
  }
  height=Math.ceil(height);
  if (!length || weight>150 || height>108 || Math.max(length,height)+2*(Math.min(length,height)+width)>165) throw Error("This order needs multiple packages. Please contact us for a shipping quote.");
  return {weightLbs:Math.ceil(weight*1000)/1000,packagingCode:"02",dimensions:{length:String(length),width:String(width),height:String(height)}};
}

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

module.exports = { MAX_SHIPPING_OPTIONS, UPS_SERVICE_NAMES, netWeightLbs, getPackageDetails, getShippingOptions };
