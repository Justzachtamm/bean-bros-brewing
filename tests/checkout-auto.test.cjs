const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('assets/storefront.js','utf8');
function harness({valid=true,editDuringQuote=false}={}){
 const calls=[];const nodes={'manual-checkout':{hidden:false},'delivery-dialog':{open:true},'shipping-form':{checkValidity:()=>valid},'payment-email':{checkValidity:()=>valid},'checkout-retry':{},'checkout-auto-status':{},'checkout-live':{disabled:false}};
 const c={checkingOut:false,shippingBusy:false,shippingQuote:null,paymentReady:false,preparingPayment:false,autoCheckoutKey:'',autoEditVersion:0,$:id=>nodes[id],autoCheckoutFingerprint:()=>String(c.autoEditVersion),quoteKey:()=>String(c.autoEditVersion),scheduleCheckout:()=>calls.push('scheduled'),renderBag(){}};
 nodes['shipping-form'].onsubmit=async()=>{calls.push('quote');if(editDuringQuote)c.autoEditVersion++;c.shippingQuote={key:String(c.autoEditVersion)}};
 nodes['checkout-live'].onclick=async()=>{calls.push('review');c.paymentReady=true};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function refreshCheckout()'),source.indexOf("for(const id of ['shipping-form'")),c);return {c,calls,nodes};
}
test('complete details automatically quote and review once, without confirming a payment',async()=>{const h=harness();await h.c.refreshCheckout();await h.c.refreshCheckout();assert.deepEqual(h.calls,['quote','review']);assert.equal(h.nodes['checkout-retry'].hidden,true)});
test('incomplete address does not make shipping or payment requests',async()=>{const h=harness({valid:false});await h.c.refreshCheckout();assert.deepEqual(h.calls,[])});
test('an address edit during a quote schedules the new address instead of reviewing the stale request',async()=>{const h=harness({editDuringQuote:true});await h.c.refreshCheckout();assert.deepEqual(h.calls,['quote','scheduled']);assert.equal(h.c.autoCheckoutKey,'')});
