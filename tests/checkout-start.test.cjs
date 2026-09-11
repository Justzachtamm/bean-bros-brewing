const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/storefront.js','utf8');
function harness({cardFails=false}={}){
 const calls=[],nodes={};const node=id=>nodes[id]||(nodes[id]={disabled:false,open:true,hidden:false,textContent:''});
 const c={$:node,renderBag(){},bag:[{isSubscription:false}],token:()=>'',closeDialog(){},openDialog(){},showManualCheckout(){},checkoutStartRevision:0,checkoutItems:()=>[{name:'Coffee',quantity:1}],syncDeliveryAutocomplete(){},api:async path=>{calls.push(path);return{publishableKey:'pk_test_example',amount:2000}},window:{BeanBrosPayment:{preload:async()=>calls.push('library'),start:async()=>{calls.push('card');if(cardFails)throw Error('Card failed');return true}},BeanBrosExpress:{start:async()=>calls.push('wallet')}},Promise};
 vm.runInNewContext(source.slice(source.indexOf("$('begin-checkout').onclick="),source.indexOf("$('back-to-bag').onclick=")),c);return{calls,nodes,start:()=>node('begin-checkout').onclick()};
}
test('wallet startup uses one setup request and mounts before manual card fields',async()=>{const h=harness();await h.start();assert.deepEqual(h.calls,['create-checkout-session','library','wallet','card']);assert.equal(h.nodes['payment-placeholder'].hidden,true)});
test('a manual card initialization failure does not remove initialized wallets',async()=>{const h=harness({cardFails:true});await h.start();assert.deepEqual(h.calls,['create-checkout-session','library','wallet','card']);assert.equal(h.nodes['wallet-retry'].hidden,true);assert.equal(h.nodes['payment-placeholder'].textContent,'Card failed')});
