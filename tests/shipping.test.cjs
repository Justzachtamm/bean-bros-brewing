const {test}=require('node:test'),assert=require('node:assert/strict');
const {loader,event}=require('./helpers.cjs');
const {getPackageDetails,netWeightLbs}=require('../netlify/functions/lib/shipping-rates');
const {shippingAddress,checkoutShipping}=require('../netlify/functions/lib/shipping-address');
const address={name:'Customer',address:'123 Main St',address2:'Apt 5',city:'Newark',state:'NJ',zip:'07102',country:'US'};
test('weights and dimensions use actual coffee, herb, gram and bundle quantities plus eight ounces once',()=>{
 const coffee={productId:1,category:'coffee',weight:'16 oz',quantity:1};
 assert.deepEqual(getPackageDetails([coffee]),{weightLbs:1.5,packagingCode:'02',dimensions:{length:'14',width:'6',height:'3'}});
 assert.equal(getPackageDetails([{...coffee,quantity:2}]).weightLbs,2.5);
 assert.equal(getPackageDetails([{...coffee,weight:'8 oz'}]).dimensions.length,'9');
 assert.equal(getPackageDetails([{productId:900001,category:'tea',weight:'1 oz (28 g)',quantity:2}]).weightLbs,0.625);
 assert.equal(getPackageDetails([{productId:900002,category:'herbs',weight:'3 individual bags',quantity:2}]).dimensions.height,'2');
 assert.ok(Math.abs(netWeightLbs('10 g')-0.022046226)<0.000001);
 assert.throws(()=>getPackageDetails([{...coffee,weight:'unknown'}]));
 assert.throws(()=>getPackageDetails([{...coffee,quantity:100}]));
});
test('delivery address is normalized and unsupported destinations are rejected',()=>{
 assert.equal(shippingAddress({...address,state:' nj '}).state,'NJ');
 for(const patch of [{zip:''},{country:'CA'},{state:'XX'},{address:''}])assert.throws(()=>shippingAddress({...address,...patch}));
 const saved=checkoutShipping({metadata:{quoted_shipping:JSON.stringify(address)},shipping_details:{address:{line1:'Different billing address'}}});
 assert.equal(saved.address.line1,address.address);assert.equal(saved.address.line2,'Apt 5');
});
function harness(validation=async()=>({verified:true})){let called=[],created=[],amount=1200;const stripe={customers:{create:async()=>({id:'cus_test'})},checkout:{sessions:{create:async c=>{created.push(c);return{id:'cs_test',url:'https://checkout.stripe.com/test'}}}}};const load=loader({stripe:()=>stripe,'./lib/products':{getProductByName:async()=>({id:1,name:'Coffee',category:'coffee',weight:'16 oz',price:20,stock:20,active:true})},'./lib/shipping-config':{getShippingConfig:async()=>({freeShipThreshold:50})},'./lib/ups':{validateAddress:validation},'./lib/shipping-rates':{getPackageDetails,getShippingOptions:async(a,p)=>{called.push({a,p});return[{serviceCode:'03',displayName:'UPS Ground',amountCents:amount,minDays:1,maxDays:5}]}}});return {handler:load('netlify/functions/create-checkout-session.js').handler,called,created,setAmount:n=>amount=n};}
const cart={items:[{name:'Coffee',quantity:1,grind:'whole-bean'}],shipTo:address,shippingService:'03',shippingAmount:1200,successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'};
test('quote uses submitted destination and catalog weight, without creating a payment',async()=>{const h=harness();const r=await h.handler(event({...cart,action:'quote',weightLbs:0.01}));assert.equal(r.statusCode,200);assert.equal(h.created.length,0);assert.equal(h.called[0].a.zip,'07102');assert.equal(h.called[0].p.weightLbs,1.5);});
test('checkout re-rates destination and refuses stale or forged prices and services',async()=>{const h=harness();assert.equal((await h.handler(event({...cart,shippingAmount:1}))).statusCode,409);assert.equal((await h.handler(event({...cart,shippingService:'01'}))).statusCode,409);assert.equal(h.created.length,0);assert.equal((await h.handler(event(cart))).statusCode,200);const c=h.created[0];assert.equal(c.shipping_address_collection,undefined);assert.equal(c.payment_intent_data.shipping.address.postal_code,address.zip);assert.equal(JSON.parse(c.metadata.quoted_shipping).address2,'Apt 5');assert.equal(JSON.parse(c.metadata.shipping_package).weightLbs,1.5);assert.equal(c.shipping_options.length,1);h.setAmount(1500);assert.equal((await h.handler(event(cart))).statusCode,409);});

test('invalid UPS street address blocks session creation before customer or payment changes',async()=>{const h=harness(async()=>{throw Object.assign(Error('Check your address'),{status:422,candidates:[]})});const body={items:[{name:'Coffee',quantity:1,grind:'whole-bean'}],shipTo:{name:'Buyer',address:'Not real',city:'New York',state:'NY',zip:'10118',country:'US'},shippingService:'03',shippingAmount:1200,successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'};const result=await h.handler(event(body));assert.equal(result.statusCode,422);assert.equal(h.created.length,0);assert.equal(h.called.length,0)});
