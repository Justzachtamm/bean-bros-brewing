const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/storefront.js','utf8');
test('subscription chooser includes requested mushrooms and excludes unavailable products',()=>{
 const context={};vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function subscriptionChoices('),source.indexOf('function showSubscriptionBuilder(')),context);
 const products=[{id:1,name:'House',active:true,stock:5},{id:2,name:'Dark',category:'coffee',active:true,stock:2},{id:3,name:'Sold out',category:'coffee',active:true,stock:0},{id:4,name:'Hidden',category:'coffee',active:false,stock:5},{id:5,name:'Reishi',category:'herbs',active:true,stock:2},{id:6,name:'Lion’s Mane',category:'herbs',active:true,stock:2},{id:7,name:'Chamomile',category:'tea',active:true,stock:3},{id:8,name:"Thrive Mode",category:"tea",active:true,stock:3}];
 const result=context.subscriptionChoices(products);
 assert.deepEqual(Array.from(result.coffees,p=>p.id),[1,2]);assert.deepEqual(Array.from(result.mushrooms,p=>p.id),[6,5,8]);
});

test('builder keeps multiple coffees and mushrooms and combines repeat adds within stock',()=>{
 const context={grindLabels:{'whole-bean':'Whole Bean'}};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function subscriptionChoices('),source.indexOf('function showSubscriptionBuilder(')),context);
 const cart=[],coffee={id:1,name:'Coffee',price:20,stock:4,active:true},mushroom={id:2,name:'Neuroshroom',category:'tea',price:12,stock:3,active:true};
 const options={quantity:1,grind:'whole-bean',recurring:true,frequency:'monthly'};
 context.addBuilderItem(cart,coffee,options);context.addBuilderItem(cart,mushroom,{...options,grind:'as-packaged'});context.addBuilderItem(cart,coffee,options);
 assert.equal(cart.length,2);assert.equal(cart[0].quantity,2);assert.equal(cart[1].isSubscription,true);assert.equal(context.subscriptionItemPrice(coffee,true),18);assert.equal(context.subscriptionItemPrice(mushroom,true),12);
 assert.throws(()=>context.addBuilderItem(cart,mushroom,{...options,quantity:3}),/available/);
});
test('server permits selected mushroom subscriptions at full price with coffee at ten percent off',async()=>{
 const {loader,event}=require('./helpers.cjs');let session;
 const catalog={Coffee:{id:1,name:'Coffee',category:'coffee',price:20,stock:5,active:true},Neuroshroom:{id:2,name:'Neuroshroom',category:'tea',weight:'1 oz',price:12,stock:5,active:true}};
 const handler=loader({stripe:()=>({customers:{create:async()=>({id:'cus_test'}),update:async()=>{}},checkout:{sessions:{create:async s=>{session=s;return{id:'cs_test',url:'https://checkout.stripe.com/test'}}}}}),'./lib/accounts':{requireSession:async()=>({user:{id:'u',email:'test@example.com'}})},'./lib/customer':{checkoutCustomer:async()=> 'cus_test'},'./lib/products':{getProductByName:async n=>catalog[n]},'./lib/shipping-config':{getShippingConfig:async()=>({freeShipThreshold:50})},'./lib/ups':{validateAddress:async()=>({verified:true})},'./lib/shipping-rates':{getPackageDetails:()=>({}),getShippingOptions:async()=>[{serviceCode:'03',displayName:'Ground',amountCents:800}]}})('netlify/functions/create-checkout-session.js').handler;
 const response=await handler(event({items:['Coffee','Neuroshroom'].map(name=>({name,quantity:1,isSubscription:true,frequency:'monthly',grind:'whole-bean'})),shipTo:{name:'Test',address:'350 Fifth Avenue',city:'New York',state:'NY',zip:'10118',country:'US'},shippingService:'03',shippingAmount:800,successUrl:'https://beanbrosbrewingco.com/#/checkout-success',cancelUrl:'https://beanbrosbrewingco.com/#/cart'}));
 assert.equal(response.statusCode,200,response.body);assert.equal(session.mode,'subscription');assert.equal(session.line_items[0].price_data.unit_amount,1800);assert.equal(session.line_items[1].price_data.unit_amount,1200);assert.equal(session.line_items[1].price_data.recurring.interval,'week');
});
