const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
function shippingAddress(value) {
  if (!value || typeof value !== 'object') throw Error('Enter your delivery address to get shipping rates.');
  const result = {};
  for (const [key, max] of Object.entries({name:80,address:100,address2:80,city:60,state:2,zip:10,country:2})) {
    const text = String(value[key] || (key === 'country' ? 'US' : '')).trim();
    if (text.length > max || /[\x00-\x1f]/.test(text)) throw Error('Please check your delivery address.');
    result[key] = ['state','country'].includes(key) ? text.toUpperCase() : text;
  }
  if (!result.name || !result.address || !result.city || !STATES.has(result.state) || !/^\d{5}(-\d{4})?$/.test(result.zip) || result.country !== 'US') throw Error('Enter a complete US delivery address, including state and ZIP code.');
  result.residential = value.residential !== false;
  return result;
}
function stripeShipping(a) { return { name:a.name, address:{line1:a.address,line2:a.address2,city:a.city,state:a.state,postal_code:a.zip,country:a.country} }; }
function checkoutShipping(session) {
  if (session.metadata?.quoted_shipping) { const a = shippingAddress(JSON.parse(session.metadata.quoted_shipping)); return {...stripeShipping(a), residential:a.residential}; }
  return session.shipping_details || session.collected_information?.shipping_details;
}
module.exports = {shippingAddress,stripeShipping,checkoutShipping};
