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

function buildAddress({ name, address, city, state, zip, country = "US" }) {
  return {
    Name: name,
    Address: {
      AddressLine: [address],
      City: city,
      StateProvinceCode: state,
      PostalCode: zip,
      CountryCode: country,
    },
  };
}

// requestOption: "Shop" returns rates for all available UPS services in one call.
async function getRates({ shipFrom, shipTo, weightLbs }) {
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
          PackagingType: { Code: "02", Description: "Package" },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(weightLbs) },
        },
        PaymentDetails: {
          ShipmentCharge: [{ Type: "01", BillShipper: { AccountNumber: shipperNumber } }],
        },
      },
    },
  };

  const res = await fetch(`${baseUrl()}/api/rating/${API_VERSION}/Shop`, {
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
  return rated.map((r) => ({
    serviceCode: r.Service.Code,
    amount: parseFloat(r.TotalCharges.MonetaryValue),
    currency: r.TotalCharges.CurrencyCode,
  }));
}

async function createShipment({ shipFrom, shipTo, weightLbs, serviceCode, description }) {
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
        Package: {
          Packaging: { Code: "02" },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(weightLbs) },
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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`UPS Shipping API failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const results = data.ShipmentResults;
  return {
    trackingNumber: results.PackageResults?.TrackingNumber,
    shipmentId: results.ShipmentIdentificationNumber,
    labelBase64: results.PackageResults?.LabelImage?.[0]?.GraphicImage,
    labelFormat: "png",
  };
}

module.exports = { isConfigured, getAccessToken, getRates, createShipment };
