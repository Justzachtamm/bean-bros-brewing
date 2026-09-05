const { UPS_SERVICE_NAMES } = require('./shipping-rates');
async function shippingService(stripe, session) {
  let rate = session.shipping_cost?.shipping_rate;
  if (typeof rate === 'string') rate = await stripe.shippingRates.retrieve(rate);
  const code = rate?.metadata?.service_code || Object.keys(UPS_SERVICE_NAMES).find(key =>
    rate?.display_name === UPS_SERVICE_NAMES[key].name || rate?.display_name === UPS_SERVICE_NAMES[key].name + ' (Free)');
  if (!code || !/^\d{2}$/.test(code)) throw new Error('Shipping service is missing');
  return code;
}
module.exports = { shippingService };
