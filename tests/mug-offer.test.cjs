const {test}=require('node:test'),assert=require('node:assert/strict');
const {apply,productId}=require('../assets/mug-offer');
const mug=quantity=>({productId,name:'Bean Bros Speckled Mug',price:20,quantity,weight:'8 oz',shippingCategory:'accessories',category:'accessories'});
const total=items=>items.reduce((n,i)=>n+Math.round(i.price*100)*i.quantity,0);
test('mug pairs cost $30, with odd mugs at $20',()=>{
 for(const [quantity,cents] of [[1,2000],[2,3000],[3,5000],[4,6000],[5,8000],[50,75000]]){
  const input=[mug(quantity)],output=apply(input);
  assert.equal(total(output),cents);assert.equal(output.reduce((n,i)=>n+i.quantity,0),quantity);
  assert.equal(input[0].price,20);assert.ok(output.every(i=>i.weight==='8 oz'&&i.productId===productId));
 }
});
test('split cart rows share the same offer and unrelated products keep full price',()=>{
 const output=apply([mug(1),{...mug(1),productId:910001},mug(2),{productId:196719769,price:19.99,quantity:1}]);
 assert.equal(total(output),8999);assert.equal(total(output.filter(i=>i.productId===910001)),2000);
});
test('subscriptions and prices below the discount are not eligible',()=>{
 assert.equal(total(apply([{...mug(2),isSubscription:true}])),4000);
 assert.equal(total(apply([{...mug(2),price:3}])),600);
});
test('wallet quote and tax use pair prices while preserving shipping',async()=>{
 const {walletQuote}=require('../netlify/functions/lib/wallet-quote');let lines;
 const stripe={tax:{calculations:{create:async p=>{lines=p;return{tax_amount_exclusive:0,amount_total:5500}}}}};
 const result=await walletQuote(stripe,{items:apply([mug(3)]),destination:{city:'Paramus',state:'NJ',zip:'07652',country:'US'},selected:{amountCents:500,displayName:'Shipping'},taxEnabled:true});
 assert.equal(result.subtotal,5000);assert.equal(result.total,5500);assert.equal(lines.shipping_cost.amount,500);
 assert.equal(lines.line_items.reduce((n,i)=>n+i.amount,0),5000);
});
