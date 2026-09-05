const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loader,event,root}=require('./helpers.cjs');
const verified={email:'customer@example.test',user:{id:'u_test',email:'customer@example.test',emailVerified:true}};
const coffee=(id='si_coffee')=>({id,quantity:2,price:{id:'price_coffee',unit_amount:1800,currency:'usd',recurring:{interval:'week',interval_count:4},product:{id:'prod_coffee',name:'Coffee',metadata:{subscription:'true',frequency:'monthly'}}}});
const shipping=()=>({id:'si_shipping',quantity:1,price:{id:'price_ship',unit_amount:799,currency:'usd',recurring:{interval:'week',interval_count:4},product:{id:'prod_ship',name:'Shipping',metadata:{}}}});
function subscriptionHarness(items) {
 const updates=[],prices=[];
 const sub={id:'sub_test',customer:'cus_test',status:'active',current_period_end:1900000000,items:{data:items}};
 const stripe={customers:{list:async()=>({data:[{id:'cus_test'}]})},subscriptions:{retrieve:async()=>sub,list:async()=>({data:[sub]}),update:async(id,patch)=>{updates.push(patch);return sub}},prices:{create:async data=>{prices.push(data);return{id:'price_new_'+prices.length}}}};
 const load=loader({stripe:()=>stripe,'./lib/accounts':{requireSession:async()=>verified}});
 return{updates,prices,sub,stripe,handler:load('netlify/functions/manage-subscription.js').handler,load};
}
test('canceling the final coffee cancels the whole subscription including shipping',async()=>{
 const h=subscriptionHarness([coffee(),shipping()]);
 const result=await h.handler(event({subscriptionId:'sub_test',itemId:'si_coffee',action:'cancel'}));
 assert.equal(result.statusCode,200);assert.equal(h.updates[0].cancel_at_period_end,true);assert.equal(h.updates[0].items,undefined);
});
test('canceling one of several coffees leaves the others; shipping cannot be managed alone',async()=>{
 const h=subscriptionHarness([coffee(),coffee('si_second'),shipping()]);
 assert.equal((await h.handler(event({subscriptionId:'sub_test',itemId:'si_coffee',action:'cancel'}))).statusCode,200);
 assert.equal(h.updates[0].items[0].deleted,true);
 assert.equal((await h.handler(event({subscriptionId:'sub_test',itemId:'si_shipping',action:'cancel'}))).statusCode,404);
 assert.equal(h.updates.length,1);
});
test('cadence changes preserve quantities and move coffee and shipping together',async()=>{
 const h=subscriptionHarness([coffee(),shipping()]);
 assert.equal((await h.handler(event({subscriptionId:'sub_test',itemId:'si_coffee',action:'update-frequency',frequency:'biweekly'}))).statusCode,200);
 assert.equal(h.prices.length,2);assert.equal(h.prices.every(p=>p.recurring.interval_count===2),true);
 assert.equal(h.updates[0].items[0].quantity,2);assert.equal(h.updates[0].items[1].quantity,1);
 const rows=await h.load('netlify/functions/lib/subscriptions.js').listCustomerSubscriptionItems(h.stripe,'cus_test');
 assert.equal(rows.length,1);assert.equal(rows[0].itemCount,1);assert.equal(rows[0].price,36);
});
test('checkout uses catalog price, captures receipt proof and preserves selected shipping service',async()=>{
 let config;
 const stripe={checkout:{sessions:{create:async data=>{config=data;return{id:'cs_test_valid',url:'https://checkout.stripe.com/test'}}}}};
 const load=loader({stripe:()=>stripe,'./lib/products':{getProductByName:async()=>({id:1788600000000,name:'Coffee',price:20,stock:3,active:true})},'./lib/shipping-config':{getShippingConfig:async()=>({freeShipThreshold:50})},'./lib/shipping-rates':{getPackageDetails:()=>({}),getShippingOptions:async()=>[{serviceCode:'02',displayName:'UPS 2nd Day Air',amountCents:1000,minDays:2,maxDays:2}]}});
 const handler=load('netlify/functions/create-checkout-session.js').handler;
 const body={items:[{name:'Coffee',price:1,quantity:2,grindLabel:'Whole Bean'}],successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'};
 const result=await handler(event(body));assert.equal(result.statusCode,200);
 assert.equal(config.line_items[0].price_data.unit_amount,2000);assert.equal(config.shipping_options[0].shipping_rate_data.metadata.service_code,'02');
 assert.equal(config.success_url,'https://beanbrosbrewingco.com/?session_id={CHECKOUT_SESSION_ID}#/checkout-success');
 assert.equal(JSON.parse(result.body).receiptToken.length,64);
 assert.equal(config.line_items[0].price_data.product_data.metadata.product_id,'1788600000000');
 body.items.push({...body.items[0]});assert.equal((await handler(event(body))).statusCode,400);
 body.items=[{...body.items[0],quantity:1.5}];assert.equal((await handler(event(body))).statusCode,400);
});
test('subscription checkout requires a verified account',async()=>{
 const load=loader({'./lib/accounts':{requireSession:async()=>({error:{statusCode:403,body:'verification required'}})},stripe:()=>{throw Error('Must not contact Stripe')}});
 const response=await load('netlify/functions/create-checkout-session.js').handler(event({items:[{isSubscription:true}],successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'}));
 assert.equal(response.statusCode,403);
});
test('invoice before checkout webhook recovers address directly from Checkout',async()=>{
 let recorded;
 const invoice={id:'in_test_first',customer:{id:'cus_test',email:'customer@example.test'},subscription:{id:'sub_test',metadata:{}},amount_paid:2599,lines:{data:[{...coffee(),amount:1800}],has_more:false}};
 const stripe={webhooks:{constructEvent:()=>({type:'invoice.paid',data:{object:{id:invoice.id}}})},invoices:{retrieve:async()=>invoice},checkout:{sessions:{list:async()=>({data:[{shipping_details:{name:'Customer',address:{line1:'123 Test St',line2:'Apt 2',city:'Test',state:'NJ',postal_code:'00000',country:'US'}}}]})}}};
 const handler=loader({stripe:()=>stripe,'./lib/orders':{recordPaidOrder:async order=>{recorded=order;return{created:true,order}}}})('netlify/functions/stripe-webhook.js').handler;
 assert.equal((await handler(event())).statusCode,200);assert.equal(recorded.shippingAddress.address2,'Apt 2');assert.equal(recorded.extra.shippingService,'03');
 stripe.checkout.sessions.list=async()=>({data:[]});recorded=null;
 assert.equal((await handler(event())).statusCode,500);assert.equal(recorded,null);
});
test('unpaid checkout event never creates a fulfilled order',async()=>{
 const stripe={webhooks:{constructEvent:()=>({type:'checkout.session.completed',data:{object:{mode:'payment',payment_status:'unpaid'}}})}};
 const handler=loader({stripe:()=>stripe,'./lib/orders':{recordPaidOrder:async()=>{throw Error('Must not record')}}})('netlify/functions/stripe-webhook.js').handler;
 assert.equal((await handler(event())).statusCode,200);
});
test('shipping label uses expedited service, apartment and private storage',async()=>{
 let shipment,storeName,patch;
 const order={id:'BB-LABEL',sessionId:'cs_test_label',shippingService:'02',items:[{quantity:1}],shippingAddress:{name:'Test',address:'123 Test St',address2:'Apt 2',city:'Test',state:'NJ',zip:'00000',country:'US'}};
 const handler=loader({stripe:()=>{throw Error('No recovery needed')},'./lib/auth':{verifyAdminToken:()=>true},'./lib/orders':{getOrderById:async()=>order,claimLabel:async()=>order,updateOrder:async(id,data)=>{patch=data}},'./lib/shipping-config':{getShippingConfig:async()=>({})},'./lib/ups':{isConfigured:()=>true,createShipment:async data=>{shipment=data;return{trackingNumber:'test-tracking',shipmentId:'test-shipment',labelBase64:Buffer.from('test-image').toString('base64')}}},'@netlify/blobs':{connectLambda(){},getStore:name=>{storeName=name;return{set:async()=>{}}}}})('netlify/functions/create-shipping-label.js').handler;
 assert.equal((await handler(event({orderId:order.id}))).statusCode,200);
 assert.equal(shipment.serviceCode,'02');assert.equal(shipment.shipTo.address2,'Apt 2');assert.equal(storeName,'shipping-labels');assert.equal(patch.labelStore,'shipping-labels');
});
test('public build contains neither backend source nor unused bundles',()=>{
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.match(html,/assets\/app-[a-f0-9]{16}\.js/);
 for(const file of ['netlify','.env','package.json','tests','scripts','website-audit'])assert.equal(fs.existsSync(path.join(root,'dist',file)),false);
 assert.equal(fs.readdirSync(path.join(root,'dist/assets')).filter(f=>f.endsWith('.js')).length,1);
});
test('packing slips escape customer-controlled HTML before opening an admin window',()=>{
 const vm=require('node:vm');
 const bundle=fs.readFileSync(path.join(root,'assets/index-zjAuvkst.js'),'utf8');
 const start=bundle.indexOf('let bbPackingSlip=o=>'),end=bundle.indexOf(';return(0,T.jsxs)',start);
 assert.ok(start>0&&end>start);
 let html;
 const sandbox={window:{open:()=>({document:{write:value=>html=value,close(){}},focus(){}})},setTimeout(){}};
 vm.runInNewContext(bundle.slice(start,end)+';bbPackingSlip({id:"test",date:"2026-09-05",items:[{name:"<img src=x onerror=alert(1)>",quantity:1}],shippingAddress:{name:"<script>bad</script>",address:"Test",city:"Test",state:"NJ",zip:"00000"}})',sandbox);
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
});
