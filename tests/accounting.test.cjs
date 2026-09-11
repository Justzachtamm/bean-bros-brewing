const {test}=require('node:test'),assert=require('node:assert/strict');
const {loader,event}=require('./helpers.cjs');
const {taxCode,snapshot,quarter,report}=require('../netlify/functions/lib/accounting');
test('tax classification rejects ambiguous herbs and uses distinct coffee/tea/accessory codes',()=>{assert.equal(taxCode('coffee'),'txcd_41050006');assert.equal(taxCode('tea'),'txcd_41050008');assert.equal(taxCode('accessories'),'txcd_99999999');assert.throws(()=>taxCode('herbs'));assert.throws(()=>taxCode('__proto__'))});
test('quarter boundaries use New Jersey time, including UTC midnight',()=>{assert.equal(quarter('2026-04-01T03:59:59Z'),'2026-Q1');assert.equal(quarter('2026-04-01T04:00:00Z'),'2026-Q2')});
test('financial snapshots preserve genuine zero tax, taxability reasons and payment time',()=>{const a=snapshot({id:'cs_1',livemode:true,currency:'usd',amount_subtotal:2000,amount_total:2000,total_details:{amount_tax:0},automatic_tax:{status:'complete'}},{created:1775000000},[{id:'li_1',amount_subtotal:2000,amount_tax:0,amount_total:2000,taxes:[{amount:0,taxability_reason:'product_exempt',rate:{id:'txr_1',state:'NJ'}}],price:{product:{name:'Coffee',metadata:{category:'coffee',tax_code:'txcd_41050006'}}}}]);assert.equal(a.tax,0);assert.equal(a.lines[0].taxes[0].reason,'product_exempt');assert.equal(a.paidAt,new Date(1775000000000).toISOString())});
test('reports never mix test orders or unknown historical taxes into live totals',()=>{const a={livemode:true,currency:'usd',paidAt:'2026-08-01T12:00:00Z',subtotal:10000,tax:663,total:10663,automaticTax:'complete',lines:[{category:'accessories',subtotal:10000,tax:663}]};const orders=[{id:'live',date:a.paidAt,shippingAddress:{state:'NJ'},accounting:a},{id:'test',date:a.paidAt,accounting:{...a,livemode:false}},{id:'old',date:a.paidAt},{id:'incomplete',date:a.paidAt,accounting:{...a,tax:null}}];const r=report(orders,'2026-Q3','live');assert.equal(r.totals.tax,663);assert.equal(r.totals.orders,1);assert.equal(r.excluded,1);assert.equal(r.missing,2);assert.equal(r.states[0].state,'NJ')});
for(const name of ['admin-accounting','admin-crm'])test(name+' rejects unauthorized reads/writes before database access',async()=>{const h=loader({stripe:()=>({})})('netlify/functions/'+name+'.js').handler;for(const method of ['GET','POST'])assert.equal((await h(event({}, {httpMethod:method}))).statusCode,401)});
function checkoutHarness(env={},category='coffee',registered=true){let config,customer;const stripe={promotionCodes:{list:async()=>({data:[{id:'promo_test',coupon:{valid:true,percent_off:10}}]})},customers:{create:async data=>{customer=data;return{id:'cus_test'}}},tax:{settings:{retrieve:async()=>({status:'active'})},registrations:{list:async function*(){if(registered)yield{country:'US',country_options:{us:{state:'NJ'}}}}}},checkout:{sessions:{create:async c=>{config=c;return{id:'cs_test',url:'https://checkout.stripe.com/test',client_secret:'cs_test_secret_example'}}}}};const h=loader({stripe:()=>stripe,'./lib/business-records':{list:async()=>[]},'./lib/products':{getProductByName:async()=>({id:1,name:'Coffee',category,price:20,stock:5,active:true})},'./lib/shipping-config':{getShippingConfig:async()=>({freeShipThreshold:50})},'./lib/ups':{validateAddress:async()=>({verified:true})},'./lib/shipping-rates':{getPackageDetails:()=>({}),getShippingOptions:async()=>[{serviceCode:'03',displayName:'Ground',amountCents:800,minDays:1,maxDays:5}]}},env)('netlify/functions/create-checkout-session.js').handler;return {h,config:()=>config,customer:()=>customer}}
const cart={shipTo:{name:'Customer',address:'123 Test St',city:'Newark',state:'NJ',zip:'07102'},shippingService:'03',shippingAmount:800,items:[{name:'Coffee',quantity:1,grindLabel:'Whole Bean'}],successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'};
test('automatic tax attaches server-owned product codes and taxes shipping separately',async()=>{const x=checkoutHarness({STRIPE_TAX_ENABLED:'true'});assert.equal((await x.h(event(cart))).statusCode,200);const c=x.config();assert.equal(c.automatic_tax.enabled,true);assert.equal(c.line_items[0].price_data.product_data.tax_code,'txcd_41050006');assert.equal(c.line_items[0].price_data.tax_behavior,'exclusive');assert.equal(c.shipping_options[0].shipping_rate_data.tax_code,'txcd_92010001')});
test('live checkout cannot silently collect without tax setup; enabled tax requires active NJ registration',async()=>{let x=checkoutHarness({STRIPE_SECRET_KEY:'sk_live_test'});assert.equal((await x.h(event(cart))).statusCode,503);assert.equal(x.config(),undefined);x=checkoutHarness({STRIPE_TAX_ENABLED:'true'},'coffee',false);assert.equal((await x.h(event(cart))).statusCode,503);assert.equal(x.config(),undefined)});
test('unclassified products cannot enter tax-enabled checkout',async()=>{const x=checkoutHarness({STRIPE_TAX_ENABLED:'true'},'herbs');assert.equal((await x.h(event(cart))).statusCode,400);assert.equal(x.config(),undefined)});
test('business records persist contacts and append money records idempotently in Postgres',async()=>{const {PGlite}=require('@electric-sql/pglite');const sql=new PGlite();try{const db={query:async(q,p)=>(await sql.query(q,p)).rows};const store=loader({'netlify/functions/lib/db.js':db})('netlify/functions/lib/business-records.js');await store.save('contact','a@example.test',{name:'A'});await store.save('contact','a@example.test',{name:'B'});assert.equal((await store.list('contact'))[0].body.name,'B');await Promise.all([store.append('expense','retry-id',{amount:200}),store.append('expense','retry-id',{amount:200})]);assert.equal((await store.list('expense')).length,1);await store.append('expense','retry-id',{amount:999});assert.equal((await store.list('expense'))[0].body.amount,200)}finally{await sql.close()}});
test('CRM and accounting endpoints validate and persist normalized records',async()=>{const {PGlite}=require('@electric-sql/pglite');const sql=new PGlite();try{const db={query:async(q,p)=>(await sql.query(q,p)).rows};const load=loader({'netlify/functions/lib/db.js':db,'./lib/auth':{verifyAdminToken:()=>true},stripe:()=>({})});const crm=load('netlify/functions/admin-crm.js').handler,accounting=load('netlify/functions/admin-accounting.js').handler;const contact={email:' OWNER@EXAMPLE.TEST ',name:'Owner',company:'A',phone:'',owner:'Staff',tags:'Wholesale',stage:'wholesale',lastContact:'2026-09-06'};assert.equal((await crm(event(contact))).statusCode,200);const data=JSON.parse((await crm(event({}, {httpMethod:'GET'}))).body);assert.equal(data.contacts[0].id,'owner@example.test');assert.equal(data.contacts[0].body.stage,'wholesale');assert.equal((await crm(event({...contact,lastContact:'2026-02-30'}))).statusCode,400);const expense={kind:'expense',id:'test-expense-1',date:'2026-09-06',amount:1250,note:'Shipping receipt',category:'shipping'};assert.equal((await accounting(event(expense))).statusCode,201);assert.equal((await accounting(event({...expense,amount:1.2}))).statusCode,400);await accounting(event(expense));assert.equal((await sql.query("SELECT * FROM business_records WHERE kind='expense'")).rows.length,1);assert.equal((await accounting(event({...expense,kind:'filing',state:'NJ',period:'2026-Q3',status:'paid',dueDate:'bad'}))).statusCode,400)}finally{await sql.close()}});
test('refund webhook records Stripe-confirmed status without inventing a tax adjustment',async()=>{let saved;const r={id:'re_1',amount:1000,currency:'usd',livemode:true,status:'succeeded',created:1788000000,payment_intent:'pi_1'};const h=loader({stripe:()=>({webhooks:{constructEvent:()=>({type:'refund.updated',data:{object:{id:r.id}}})},refunds:{retrieve:async()=>r}}),'./lib/business-records':{save:async(...v)=>{saved=v}}})('netlify/functions/stripe-webhook.js').handler;assert.equal((await h(event())).statusCode,200);assert.equal(saved[0],'refund');assert.equal(saved[1],'re_1');assert.equal(saved[2].taxAdjustment,null);assert.equal(saved[2].status,'succeeded')});

test('automatic tax avoids incompatible payment shipping while preserving the delivery address',async()=>{
 const x=checkoutHarness({STRIPE_TAX_ENABLED:'true'});
 assert.equal((await x.h(event(cart))).statusCode,200);
 const c=x.config();
 assert.equal(c.automatic_tax.enabled,true);
 assert.equal(c.payment_intent_data,undefined);
 assert.equal(c.customer,'cus_test');
 assert.equal(x.customer().shipping.address.postal_code,cart.shipTo.zip);
 assert.equal(x.customer().shipping.address.line1,cart.shipTo.address);
 assert.equal(JSON.parse(c.metadata.quoted_shipping).zip,cart.shipTo.zip);
 assert.equal(c.shipping_address_collection,undefined);
});

test('embedded checkout returns only the public key and client secret, with a valid return URL',async()=>{
 const x=checkoutHarness({STRIPE_TAX_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_PUBLISHABLE_KEY:'pk_test_example'});
 const r=await x.h(event({...cart,embedded:true}));assert.equal(r.statusCode,200);
 const c=x.config(),d=JSON.parse(r.body);
 assert.equal(c.ui_mode,'embedded');assert.equal(c.success_url,undefined);assert.equal(c.cancel_url,undefined);
 assert.equal(c.return_url,'https://beanbrosbrewingco.com/?session_id={CHECKOUT_SESSION_ID}#/checkout-success');
 assert.equal(c.payment_intent_data,undefined);assert.equal(c.automatic_tax.enabled,true);
 assert.equal(d.clientSecret,'cs_test_secret_example');assert.equal(d.publishableKey,'pk_test_example');assert.equal(d.url,undefined);assert.ok(d.receiptToken);assert.ok(!r.body.includes('sk_test'));
});
test('embedded checkout rejects missing or mismatched public keys before creating payment sessions',async()=>{
 for(const key of ['', 'sk_test_invalid','pk_live_example']){
  const x=checkoutHarness({STRIPE_SECRET_KEY:'sk_test_example',STRIPE_PUBLISHABLE_KEY:key});
  assert.equal((await x.h(event({...cart,embedded:true}))).statusCode,503);assert.equal(x.config(),undefined);
 }
});

test('payment-first checkout uses custom UI and preserves calculated shipping and tax',async()=>{
 const x=checkoutHarness({STRIPE_TAX_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_example',STRIPE_PUBLISHABLE_KEY:'pk_test_example'});
 const r=await x.h(event({...cart,paymentFirst:true}));assert.equal(r.statusCode,200);
 const c=x.config();assert.equal(c.ui_mode,'custom');assert.equal(c.custom_text,undefined);assert.equal(c.phone_number_collection,undefined);assert.equal(c.payment_intent_data,undefined);assert.equal(c.shipping_options[0].shipping_rate_data.fixed_amount.amount,800);assert.equal(c.automatic_tax.enabled,true);assert.equal(JSON.parse(r.body).clientSecret,'cs_test_secret_example');
});
test('payment config exposes only a matching publishable key',async()=>{
 const h=loader({}, {STRIPE_SECRET_KEY:'sk_test_example',STRIPE_PUBLISHABLE_KEY:'pk_test_example'})('netlify/functions/payment-config.js').handler;
 const r=await h(event({}, {httpMethod:'GET'}));assert.equal(r.statusCode,200);assert.deepEqual(JSON.parse(r.body),{publishableKey:'pk_test_example'});
 assert.equal((await h(event())).statusCode,405);
 const missing=loader()('netlify/functions/payment-config.js').handler;assert.equal((await missing(event({}, {httpMethod:'GET'}))).statusCode,503);
});

test('nutritional supplements enter tax-enabled checkout with the nutritional tax code',async()=>{const x=checkoutHarness({STRIPE_TAX_ENABLED:'true'},'nutritional_supplements');assert.equal((await x.h(event(cart))).statusCode,200);assert.equal(x.config().line_items[0].price_data.product_data.tax_code,'txcd_40090008');assert.equal(x.config().automatic_tax.enabled,true)});

test('promo validation works before delivery without creating a payment session',async()=>{const x=checkoutHarness({STRIPE_TAX_ENABLED:'true'});const r=await x.h(event({action:'promo-check',items:cart.items,promoCode:'SAVE10'}));assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).discount,200);assert.equal(x.config(),undefined);assert.equal(x.customer(),undefined)});
