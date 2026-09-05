// UPS REST API client — OAuth2 client-credentials + Rating (Shop) + Shipping.
//
// Built against UPS's published OpenAPI specs (OAuthClientCredentials.yaml,
// Rating.yaml, Shipping.yaml — github.com/UPS-API/api-documentation). This
// has NOT been tested against a live UPS account: as of this writing there
// are no UPS_CLIENT_ID/UPS_CLIENT_SECRET credentials configured. Everything
// fails closed with a clear "UPS is not configured" error until they exist.
//
// Defaults to UPS's sandbox/testing host (wwwcie.ups.com). Set
// UPS_ENV=production to point at the real onlinetools.ups.com host once
// you've validated against sandbox.

const API_VERSION = "v2409";

function baseUrl() {
  return process.env.UPS_ENV === "production" ? "https://onlinetools.ups.com" : "https://wwwcie.ups.com";
}

function isConfigured() {
  return !!(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET && process.env.UPS_ACCOUNT_NUMBER);
}

// In-memory cache — best-effort only. Netlify Functions containers can be
// reused across invocations (cheap win) or cold-started fresh (falls back to
// a real token fetch); either way this never breaks correctness.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (!isConfigured()) {
    throw new Error("UPS is not configured (missing UPS_CLIENT_ID/UPS_CLIENT_SECRET/UPS_ACCOUNT_NUMBER)");
  }
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${baseUrl()}/security/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "x-merchant-id": process.env.UPS_ACCOUNT_NUMBER,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`UPS OAuth token request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // expires_in is a string, seconds. Refresh a bit early to avoid edge-of-expiry failures.
  cachedTokenExpiresAt = Date.now() + (parseInt(data.expires_in, 10) - 60) * 1000;
  return cachedToken;
}

function buildAddress({ name, address, address2, city, state, zip, country = "US" }) {
  return {
    Name: name,
    Address: {
      AddressLine: [address, address2].filter(Boolean),
      City: city,
      StateProvinceCode: state,
      PostalCode: zip,
      CountryCode: country,
    },
  };
}

// requestOption: "Shoptimeintransit" returns rates AND real transit-time
// estimates for all available UPS services in one call (plain "Shop" only
// returns rates). The transit-time field parsed below (GuaranteedDelivery /
// BusinessDaysInTransit) is my best understanding of UPS's documented shape,
// NOT yet confirmed against a live response — there are no UPS credentials
// configured to test against. If the field turns out to be named or nested
// differently, transitDays below just comes back null and
// create-checkout-session.js falls back to its static day-range estimates,
// so a wrong guess here degrades gracefully rather than breaking rates.
async function getRates({ shipFrom, shipTo, weightLbs, packagingCode = "02", dimensions = null }) {
  const token = await getAccessToken();
  const shipperNumber = process.env.UPS_ACCOUNT_NUMBER;

  const body = {
    RateRequest: {
      Request: { SubVersion: "2409" },
      Shipment: {
        Shipper: { ...buildAddress(shipFrom), ShipperNumber: shipperNumber },
        ShipFrom: buildAddress(shipFrom),
        ShipTo: buildAddress(shipTo),
        Package: {
          PackagingType: { Code: packagingCode, Description: "Package" },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(weightLbs) },
          // Dimensions affect dimensional-weight pricing for lightweight-but-
          // bulky packages (e.g. a bubble mailer) — only sent when supplied,
          // since UPS ignores/rejects it for some packaging types otherwise.
          ...(dimensions
            ? { Dimensions: { UnitOfMeasurement: { Code: "IN" }, Length: dimensions.length, Width: dimensions.width, Height: dimensions.height } }
            : {}),
        },
        PaymentDetails: {
          ShipmentCharge: [{ Type: "01", BillShipper: { AccountNumber: shipperNumber } }],
        },
        // Required by the Shoptimeintransit request option — omitting it fails
        // with "Delivery Time Information Container is required..." (error
        // 111563). PackageBillType 03 = Non-Document (a physical package).
        DeliveryTimeInformation: { PackageBillType: "03" },
        // Without this indicator UPS returns ONLY published (retail) rates,
        // even when ShipperNumber is present on the request — the account's
        // negotiated discount never appears in the response at all. With it,
        // each RatedShipment additionally carries NegotiatedRateCharges,
        // which getRates prefers below. Requires the account to be
        // authorized for negotiated rates on ups.com; if it isn't, UPS just
        // omits the field and we fall back to published pricing.
        ShipmentRatingOptions: { NegotiatedRatesIndicator: "Y" },
      },
    },
  };

  const res = await fetch(`${baseUrl()}/api/rating/${API_VERSION}/Shoptimeintransit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      transId: `bb-${Date.now()}`,
      transactionSrc: "beanbrosbrewingco",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`UPS Rating API failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const rated = data.RateResponse?.RatedShipment || [];
  let sawNegotiated = false;
  const results = rated.map((r) => {
    const days = parseInt(r.GuaranteedDelivery?.BusinessDaysInTransit, 10);
    // Negotiated (account-discounted) price rides alongside the published
    // TotalCharges as its own field — it is NOT a duplicate RatedShipment
    // entry. Prefer it whenever present; fall back to published so a
    // not-yet-authorized account still gets working (retail) rates.
    const published = parseFloat(r.TotalCharges.MonetaryValue);
    const negotiated = parseFloat(r.NegotiatedRateCharges?.TotalCharge?.MonetaryValue);
    const useNegotiated = Number.isFinite(negotiated);
    if (useNegotiated) sawNegotiated = true;
    return {
      serviceCode: r.Service.Code,
      amount: useNegotiated ? negotiated : published,
      publishedAmount: published,
      negotiated: useNegotiated,
      currency: (useNegotiated ? r.NegotiatedRateCharges.TotalCharge.CurrencyCode : null) || r.TotalCharges.CurrencyCode,
      transitDays: Number.isFinite(days) ? days : null,
      deliveryByTime: r.GuaranteedDelivery?.DeliveryByTime || null,
    };
  });
  if (rated.length && !sawNegotiated) {
    // Loud but non-fatal: the request asked for negotiated rates and UPS
    // didn't return any — usually means the UPS account isn't authorized
    // for negotiated rates in the developer portal / ups.com yet, so
    // customers are being quoted full retail pricing.
    console.warn("UPS returned no NegotiatedRateCharges — quoting PUBLISHED (retail) rates. Check that the UPS account is authorized for negotiated rates.");
  }
  return results;
}

async function createShipment({ shipFrom, shipTo, weightLbs, serviceCode, description, packagingCode = "02", dimensions = null }) {
  const token = await getAccessToken();
  const shipperNumber = process.env.UPS_ACCOUNT_NUMBER;

  const body = {
    ShipmentRequest: {
      Request: { RequestOption: "nonvalidate", SubVersion: "2409" },
      Shipment: {
        Description: description || "Coffee order",
        Shipper: { ...buildAddress(shipFrom), ShipperNumber: shipperNumber },
        ShipFrom: buildAddress(shipFrom),
        ShipTo: buildAddress(shipTo),
        PaymentInformation: {
          ShipmentCharge: { Type: "01", BillShipper: { AccountNumber: shipperNumber } },
        },
        Service: { Code: serviceCode },
        // Same as getRates: without this, the shipment's returned charges
        // reflect published pricing instead of the account's negotiated
        // rates (actual invoicing bills the account either way, but the
        // logged charges should match what the account really pays).
        ShipmentRatingOptions: { NegotiatedRatesIndicator: "Y" },
        Package: {
          Packaging: { Code: packagingCode },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(weightLbs) },
          ...(dimensions
            ? { Dimensions: { UnitOfMeasurement: { Code: "IN" }, Length: dimensions.length, Width: dimensions.width, Height: dimensions.height } }
            : {}),
        },
      },
      LabelSpecification: { LabelImageFormat: { Code: "PNG" } },
    },
  };

  const res = await fetch(`${baseUrl()}/api/shipments/${API_VERSION}/ship`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      transId: `bb-${Date.now()}`,
      transactionSrc: "beanbrosbrewingco",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`UPS Shipping API failed (${res.status}): ${text.slice(0, 300)}`);
  }

  // Always log the raw response BEFORE parsing. A 2xx from this endpoint
  // means UPS already created a real, billable-on-pickup shipment — if the
  // shape below ever turns out wrong again, this line is what lets a human
  // recover the tracking/shipment ID from the logs instead of losing it.
  // Uncapped — the base64 label image alone can run past 100KB, and a
  // truncated log line is useless for recovering a shipment/tracking ID
  // after the fact (this is the whole point of logging it).
  // Carrier responses contain customer addresses and label data; do not log them.

  const data = JSON.parse(text);
  // Success responses are wrapped in ShipmentResponse (per UPS's
  // SHIPResponseWrapper schema) — NOT top-level ShipmentResults.
  const results = data.ShipmentResponse?.ShipmentResults;
  if (!results) {
    throw new Error(`UPS returned 2xx but the response didn't have the expected ShipmentResponse.ShipmentResults shape — check the raw-response log line above to recover any shipment/tracking ID and void it manually if needed.`);
  }
  // PackageResults is documented as always an array for v2403+ (this lib
  // targets v2409) — a single object here was the earlier, wrong assumption.
  // The label image lives at PackageResults[0].ShippingLabel.GraphicImage,
  // not a top-level LabelImage array.
  const pkg = Array.isArray(results.PackageResults) ? results.PackageResults[0] : results.PackageResults;
  const shipmentId = results.ShipmentIdentificationNumber;
  const trackingNumber = pkg?.TrackingNumber;
  const labelBase64 = pkg?.ShippingLabel?.GraphicImage;
  if (!shipmentId || !trackingNumber || !labelBase64) {
    // A real, billable shipment already exists on UPS's side at this point —
    // fail loudly with the shipmentId (if we have it) so the caller can void
    // it immediately, instead of silently returning a partial/null result.
    throw new Error(`UPS created the shipment but a field was missing from the response (shipmentId=${shipmentId}, trackingNumber=${trackingNumber}, hasLabel=${!!labelBase64}) — check the raw-response log line above and void shipmentId ${shipmentId || "(unknown — see raw log)"} manually if present.`);
  }
  return { trackingNumber, shipmentId, labelBase64, labelFormat: "png" };
}

// DELETE /shipments/{version}/void/cancel/{shipmentidentificationnumber}?trackingnumber=...
// Built against UPS's published Shipping.yaml (VoidShipment operation) — no
// request body, just path + query params. ResponseStatus.Code === "1" means
// success (UPS's own convention across this API family).
async function voidShipment({ shipmentId, trackingNumber }) {
  const token = await getAccessToken();

  const url = `${baseUrl()}/api/shipments/${API_VERSION}/void/cancel/${encodeURIComponent(shipmentId)}${trackingNumber ? `?trackingnumber=${encodeURIComponent(trackingNumber)}` : ""}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      transId: `bb-void-${Date.now()}`,
      transactionSrc: "beanbrosbrewingco",
    },
  });

  const text = await res.text();

  const data = JSON.parse(text || "{}");

  if (!res.ok) {
    const msg = data?.response?.errors?.[0]?.message || data?.Fault?.faultstring || JSON.stringify(data).slice(0, 300);
    throw new Error(`UPS Void Shipment failed (${res.status}): ${msg}`);
  }

  const status = data.VoidShipmentResponse?.Response?.ResponseStatus;
  const summary = data.VoidShipmentResponse?.SummaryResult?.Status;
  const success = status?.Code === "1";
  if (!success) {
    throw new Error(`UPS Void Shipment did not confirm success: ${JSON.stringify(status || summary || data).slice(0, 300)}`);
  }

  return { ok: true, description: summary?.Description || status?.Description || "Voided" };
}

module.exports = { isConfigured, getAccessToken, getRates, createShipment, voidShipment };
