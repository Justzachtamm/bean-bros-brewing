const crypto = require('node:crypto');
const DAY = 86400000;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function signingKey(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('Review signing secret must contain at least 32 bytes');
  return secret;
}
function sign(id, secret, now = Date.now()) {
  const data = Buffer.from(JSON.stringify({id, exp: now + 45 * DAY, purpose:'order-review'})).toString('base64url');
  return data + '.' + crypto.createHmac('sha256', signingKey(secret)).update(data).digest('base64url');
}
function verify(token, secret, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 1024) return null;
    const [data, signature, extra] = token.split('.');
    if (!data || !signature || extra !== undefined) return null;
    const expected = crypto.createHmac('sha256', signingKey(secret)).update(data).digest('base64url');
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return payload.purpose === 'order-review' && typeof payload.id === 'string' && Number.isSafeInteger(payload.exp) && payload.exp > now ? payload.id : null;
  } catch { return null; }
}
function safeImage(value) {
  try {const url = new URL(value);return url.protocol === 'https:' && url.hostname === 'cdn.shopify.com' ? url.href : '';} catch {return '';}
}
function normalizeOrder(order, now = Date.now()) {
  const deliveredAt = Date.parse(order.deliveredAt);
  if (order.test || order.cancelledAt || !order.id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.email || '') || !Number.isFinite(deliveredAt) || deliveredAt > now) throw new Error('A delivered, live Shopify order is required');
  const items = (order.items || []).filter(i => i.productId && Number.isInteger(i.quantity) && i.quantity > 0).map(i => ({productId:String(i.productId),variantId:/^\d+$/.test(String(i.variantId)) ? String(i.variantId) : null,name:String(i.name || 'Your coffee').slice(0,200),quantity:i.quantity,image:safeImage(i.image)}));
  if (!items.length || items.length > 250) throw new Error('Order has no eligible products');
  return {id:String(order.id),name:String(order.name || '').slice(0,100),email:order.email,items,deliveredAt:new Date(deliveredAt).toISOString()};
}
function pageLink(origin, token, productId, rating) {
  const url = new URL('/order-review.html', origin);
  if (url.protocol !== 'https:' || url.origin !== new URL(origin).origin) throw new Error('HTTPS review origin required');
  // Fragment keeps the bearer link out of HTTP access logs and referrers.
  url.hash = new URLSearchParams({token,product:productId,rating:String(rating)}).toString();
  return url.href;
}
function renderEmail(order, token, origin, logoUrl) {
  const products = [...new Map(order.items.map(i => [i.productId,i])).values()];
  const items = products.map(i => `<tr><td style="padding:24px 0;border-bottom:1px solid #ddd8ca">${i.image ? `<img src="${esc(i.image)}" alt="${esc(i.name)}" width="120" style="max-width:120px;height:auto">` : ''}<h2 style="font-size:20px">${esc(i.name)}</h2><p>How was your coffee? Choose your rating:</p><p>${[1,2,3,4,5].map(r => `<a aria-label="Rate ${r} out of 5" href="${esc(pageLink(origin,token,i.productId,r))}" style="display:inline-block;padding:12px 10px;color:#244b38;font-size:22px;text-decoration:none">${r} ★</a>`).join(' ')}</p></td></tr>`).join('');
  const quantities = new Map();
  for(const item of order.items)if(item.variantId)quantities.set(item.variantId,(quantities.get(item.variantId)||0)+item.quantity);
  const cartItems = [...quantities].map(([id,quantity])=>id+':'+quantity).join(',');
  const reorder = cartItems ? 'https://beanbrosbrewingco.com/cart/'+cartItems : 'https://beanbrosbrewingco.com/account';
  const logo = safeImage(logoUrl);
  return {subject:'How was your Bean Bros order?',html:`<!doctype html><html><body style="margin:0;background:#f5f1e6;color:#244b38;font-family:Futura,'Trebuchet MS',Arial,sans-serif"><table role="presentation" style="max-width:560px;width:100%;margin:auto;padding:28px"><tr><td>${logo ? `<img src="${esc(logo)}" alt="Bean Bros Brewing Co." width="180">` : '<strong>BEAN BROS BREWING CO.</strong>'}<h1>How was your brew?</h1><p>Tell us what you thought of the products in order ${esc(order.name)}.</p></td></tr>${items}<tr><td><p>Your rating opens a private review page. Add your comment and submit. Reviews appear publicly only after approval.</p><p><a href="${esc(reorder)}">Reorder your favorites</a></p><p>Bean Bros Brewing Co. · 556 North Route 17, Paramus, NJ 07652</p></td></tr></table></body></html>`,text:`How was your Bean Bros order ${order.name}?\n\n`+products.map(i => i.name+'\n'+pageLink(origin,token,i.productId,5)).join('\n\n')+'\n\nChoose or change your rating on the page and add a comment. Reviews remain private until approved.\nReorder: '+reorder,tag:'order-review'};
}
module.exports = {DAY,sign,verify,normalizeOrder,renderEmail,pageLink};
