const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/storefront.js','utf8');
for(const subscription of [true,false])test(`checkout retains address and shipping while controls are disabled (${subscription?'subscription':'one-time'})`,async()=>{
 const controls=Object.fromEntries(Object.entries({name:'Customer',address:'350 Fifth Avenue',address2:'',city:'New York',state:'NY',zip:'10118',location:'business',shippingService:'03'}).map(([k,value])=>[k,{value,disabled:false}]));
 const elements={namedItem:k=>controls[k]};
 const nodes={'shipping-form':{elements},'checkout-live':{disabled:false},'delivery-warning':{innerHTML:''},'shipping-status':{},'payment-placeholder':{},'payment-email':{reportValidity:()=>true},'edit-delivery':{}};
 let request,redirect,mounted;
 const context={Object,JSON,URL,Error,$:id=>nodes[id],checkingOut:false,paymentRevision:0,paymentReady:false,window:{BeanBrosPayment:{prepare:async data=>{mounted=data;return true}}},shippingQuote:{options:[{serviceCode:'03',amountCents:777}]},bag:[{isSubscription:subscription,product:{name:'Coffee'},quantity:1}],checkoutItems:()=>[{name:'Coffee',quantity:1,isSubscription:subscription}],token:()=> 'test',persist:()=>{},account:()=>{throw Error('Unexpected sign-in')},clearShipping:()=>{throw Error('Rate unexpectedly cleared')},escapeHTML:x=>x,storage:{set:()=>true},location:{origin:'https://beanbrosbrewingco.com',assign:u=>redirect=u},api:async(path,body)=>{request=body;return{clientSecret:'cs_test_secret_example',publishableKey:'pk_test_example',sessionId:'cs_test',receiptToken:'test'}}};
 vm.createContext(context);
 const address=source.slice(source.indexOf('function deliveryAddress()'),source.indexOf('function quoteKey()'));
 vm.runInContext(address,context);
 const before=JSON.stringify(context.deliveryAddress());
 context.renderBag=()=>{Object.values(controls).forEach(c=>c.disabled=context.checkingOut);assert.equal(JSON.stringify(context.deliveryAddress()),before);};
 const handler=source.slice(source.indexOf("$('checkout-live').onclick="),source.indexOf("$('begin-checkout').onclick="));
 vm.runInContext(handler,context);
 await nodes['checkout-live'].onclick();
 assert.equal(request.shipTo.zip,'10118');assert.equal(request.shipTo.residential,false);assert.equal(request.shippingAmount,777);assert.equal(request.shippingService,'03');assert.equal(request.paymentFirst,true);assert.equal(redirect,undefined);assert.equal(mounted.clientSecret,'cs_test_secret_example');assert.equal(context.paymentReady,true);assert.equal(context.checkingOut,false);
});
test('bag opens delivery checkout before collecting shipping or payment',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const bag=html.slice(html.indexOf('<dialog id="cart-dialog"'),html.indexOf('</dialog>',html.indexOf('<dialog id="cart-dialog"')));
 const delivery=html.slice(html.indexOf('<dialog id="delivery-dialog"'),html.indexOf('</dialog>',html.indexOf('<dialog id="delivery-dialog"')));
 assert.match(bag,/id="begin-checkout"/);assert.doesNotMatch(bag,/id="shipping-form"/);
 assert.match(delivery,/id="shipping-form"/);assert.match(delivery,/id="promo-code"/);assert.match(delivery,/id="checkout-live"/);assert.match(delivery,/id="embedded-payment"/);
});
