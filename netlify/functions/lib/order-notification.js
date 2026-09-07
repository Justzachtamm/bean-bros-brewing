const care=require('./customer-care');
const OWNER='zach@beanbrosbrewingco.com';
function receipt(order){
 const a=order.accounting||{},currency=(a.currency||'usd').toUpperCase();
 const money=cents=>Number.isSafeInteger(cents)?new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100):'Not recorded';
 const rows=order.items.filter(i=>!i.isShipping).map((i,n)=>{const l=(a.lines||[]).filter(l=>l.category!=='shipping')[n];const amount=l?.subtotal;return `${i.quantity} × ${i.name}${i.grind?' — '+(i.grindLabel||i.grind):''}${i.frequency?' ('+i.frequency+')':''}\n   ${Number.isSafeInteger(amount)&&i.quantity>0?'Unit: '+money(Math.round(amount/i.quantity))+' · ':''}Line subtotal: ${money(amount)}`});
 const s=order.shippingAddress||{},subtotal=Number.isSafeInteger(a.subtotal)&&a.invoice&&Number.isSafeInteger(a.shipping)?a.subtotal-a.shipping:a.subtotal;
 const body=[`Paid order ${order.id}`,`Date: ${a.paidAt||order.date||'Not recorded'}`,`Customer: ${order.customerName||'Guest'}`,`Email: ${order.customerEmail||'Not provided'}`,'',...rows,'',`Items subtotal: ${money(subtotal)}`,`Discount: ${money(a.discount??0)}`,`Shipping: ${money(a.shipping??0)}`,`Tax: ${money(a.tax)}`,`TOTAL PAID: ${money(a.paid)}`,'','Deliver to:',s.name||order.customerName,s.address,s.address2,[s.city,s.state,s.zip].filter(Boolean).join(', '),s.country||'US',`Service: ${order.shippingService||'Not recorded'}`,`Payment reference: ${a.paymentIntent||a.invoice||order.sessionId||''}`].filter(x=>x!==undefined&&x!==null).join('\n');
 return {...care.message(`New paid order ${order.id} — ${money(a.paid)}`,body,'https://beanbrosbrewingco.com/admin.html#orders','View order in admin'),tag:'order-notification'};
}
async function notifyOwner(order){if(order.accounting?.livemode!==true)return;await care.queue('owner-order:'+order.sessionId,OWNER,receipt(order));}
module.exports={receipt,notifyOwner,OWNER};
