const {test}=require('node:test'),assert=require('node:assert/strict');
const {walletQuote}=require('../netlify/functions/lib/wallet-quote');const {shippingAddress}=require('../netlify/functions/lib/shipping-address');
const destination={city:'New York',state:'NY',zip:'10118',country:'US'};
test('wallet locality can be quoted, but cannot be used as a final delivery address',()=>{assert.equal(shippingAddress(destination,{partial:true}).zip,'10118');assert.throws(()=>shippingAddress(destination));assert.throws(()=>shippingAddress({...destination,country:'CA'},{partial:true}))});
test('wallet total uses server prices, real selected shipping and Stripe tax',async()=>{
 let params;const stripe={tax:{calculations:{create:async p=>{params=p;return{tax_amount_exclusive:140,amount_total:2916}}}}};
 const result=await walletQuote(stripe,{items:[{name:'Coffee',price:19.99,quantity:1,category:'coffee'}],destination,selected:{amountCents:777,displayName:'UPS Ground'},taxEnabled:true});
 assert.equal(result.total,2916);assert.equal(params.line_items[0].amount,1999);assert.equal(params.shipping_cost.amount,777);assert.equal(params.customer_details.address.postal_code,'10118');assert.equal(params.customer_details.address.line1,undefined);
});
test('wallet promo discount never reduces shipping and allocation preserves the exact discounted subtotal',async()=>{
 let params;const stripe={promotionCodes:{list:async()=>({data:[{coupon:{valid:true,amount_off:500,currency:'usd'}}]})},tax:{calculations:{create:async p=>{params=p;return{tax_amount_exclusive:0,amount_total:2777}}}}};
 const result=await walletQuote(stripe,{items:[{price:10,quantity:1,category:'coffee'},{price:15,quantity:1,category:'coffee'}],destination,selected:{amountCents:777,displayName:'UPS Ground'},promoCode:'SAVE5',taxEnabled:true});
 assert.equal(result.discount,500);assert.equal(params.line_items.reduce((n,l)=>n+l.amount,0),2000);assert.equal(params.shipping_cost.amount,777);
});
