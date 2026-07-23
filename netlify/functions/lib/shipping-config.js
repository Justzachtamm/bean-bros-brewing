const { getStore } = require("@netlify/blobs");

const STORE_NAME = "shipping-config";
const KEY = "config";

const DEFAULT_CONFIG = {
  shipFromName: "Bean Bros Brewing Co.",
  shipFromAddress: "",
  shipFromCity: "",
  shipFromState: "NJ",
  shipFromZip: "",
  freeShipThreshold: 40,
  defaultWeightLbs: 2,
};

async function getShippingConfig() {
  const data = await getStore(STORE_NAME).get(KEY, { type: "json" });
  return { ...DEFAULT_CONFIG, ...(data || {}) };
}

async function saveShippingConfig(config) {
  await getStore(STORE_NAME).setJSON(KEY, config);
}

module.exports = { getShippingConfig, saveShippingConfig, DEFAULT_CONFIG };
