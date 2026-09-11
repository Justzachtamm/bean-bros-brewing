const {taxCode}=require('./accounting');
// Wallets redact street/name until confirmation. UPS and Stripe quote from the
// available locality; the normal checkout revalidates the full address later.
async function walletQuote(stripe,{items,destination,selected,promoCode,taxEnabled,hasSubscription}){
 const amounts=items.map(i=>Math.round(i.price*100)*i.quantity),subtotal=amounts.reduce((a,b)=>a+b,0);
 let discount=0;
 if(promoCode){
  if(hasSubscription)throw Error('Promo codes apply to one-time purchases. Subscriptions already receive 10% off.');
  if(typeof promoCode!=='string'||!/^[A-Za-z0-9]{3,30}$/.test(promoCode.trim()))throw Error('Enter a valid promo code.');
  const matches=await stripe.promotionCodes.list({code:promoCode.trim(),active:true,limit:1}),p=matches.data[0],c=p?.coupon;
  if(!c?.valid||(p.expires_at&&p.expires_at<=Date.now()/1000)||(p.max_redemptions&&p.times_redeemed>=p.max_redemptions))throw Error('This promo code is invalid, expired, or fully redeemed.');
  if(p.customer||p.restrictions?.first_time_transaction||c.applies_to?.products?.length)throw Error('Use manual checkout for this restricted promo code.');
  if(p.restrictions?.minimum_amount>subtotal)throw Error('Your order does not meet this promo code’s minimum.');
  if(c.amount_off&&c.currency!=='usd')throw Error('This promo code is not valid for USD orders.');
  discount=Math.min(subtotal,c.percent_off?Math.round(subtotal*c.percent_off/100):c.amount_off||0);
 }
 let remaining=discount;
 const lines=items.map((item,n)=>{const off=n===items.length-1?remaining:Math.min(remaining,Math.floor(discount*amounts[n]/subtotal));remaining-=off;return {amount:amounts[n]-off,reference:String(n),tax_code:taxCode(item.category),tax_behavior:'exclusive'}});
 let tax=0,total=subtotal-discount+selected.amountCents;
 if(taxEnabled){
  const a=destination;
  const calculation=await stripe.tax.calculations.create({currency:'usd',customer_details:{address:{...(a.address?{line1:a.address}:{}),city:a.city,state:a.state,postal_code:a.zip,country:a.country},address_source:'shipping'},line_items:lines,shipping_cost:{amount:selected.amountCents,tax_behavior:'exclusive',tax_code:'txcd_92010001'}});
  tax=calculation.tax_amount_exclusive;total=calculation.amount_total;
 }
 return {subtotal,discount,tax,total,currency:'usd',lineItems:[{name:discount?'Items (promo applied)':'Items',amount:subtotal-discount},{name:selected.displayName,amount:selected.amountCents},{name:'Tax',amount:tax}]};
}
module.exports={walletQuote};
