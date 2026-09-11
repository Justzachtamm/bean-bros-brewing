'use strict';
// Stripe owns every card field. Only payment-method IDs leave its Elements.
window.BeanBrosPayment=(()=>{
 let stripe,card,billing,checkout,actions,wallet,loading,revision=0,cardRevision=0,paying=false;
 const node=id=>document.getElementById(id);
 function library(){
  if(window.Stripe)return Promise.resolve(window.Stripe);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.stripe.com/clover/stripe.js';script.async=true;const timeout=setTimeout(fail,15000);function fail(){clearTimeout(timeout);script.remove();loading=null;reject(Error('Secure payment could not load. Please retry.'))}script.onload=()=>{clearTimeout(timeout);window.Stripe?resolve(window.Stripe):fail()};script.onerror=fail;document.head.appendChild(script)});return loading;
 }
 function reset(){revision++;actions=null;checkout=null;if(wallet){wallet.destroy();wallet=null}node('wallet-payment').replaceChildren();node('payment-review').hidden=true;node('pay-order').hidden=true;node('payment-error').textContent='';node('billing-address').hidden=node('billing-same').checked}
 function destroy(){reset();cardRevision++;if(card)card.destroy();if(billing)billing.destroy();card=null;billing=null;stripe=null}
 async function start(publishableKey){destroy();const current=cardRevision;const Stripe=await library();if(current!==cardRevision)return false;stripe=Stripe(publishableKey);const elements=stripe.elements();card=elements.create('card',{hidePostalCode:true});card.mount('#embedded-payment');card.on('change',e=>{node('payment-error').textContent=e.error?.message||''});billing=elements.create('address',{mode:'billing'});billing.mount('#billing-address');return true}
 async function billingDetails(destination){if(node('billing-same').checked)return {name:destination.name,address:{line1:destination.address,line2:destination.address2,city:destination.city,state:destination.state,postal_code:destination.zip,country:'US'}};const result=await billing.getValue();if(!result.complete)throw Error('Complete your billing address.');return {name:result.value.name,address:result.value.address}}
 function checked(result){if(result.type==='error')throw Error(result.error.message);return result}
 async function prepare(data,destination,onBusy){
  reset();const current=revision;try{if(!stripe||!card)throw Error('Wait for the secure card fields to load, then retry.');
  const init=stripe.initCheckoutElementsSdk||stripe.initCheckout;
  const next=await init.call(stripe,{clientSecret:data.clientSecret});
  const loaded=checked(await next.loadActions());if(current!==revision)return false;
  const nextActions=loaded.actions,contact=await billingDetails(destination);
  checked(await nextActions.updateEmail(node('payment-email').value.trim()));
  checked(await nextActions.updateBillingAddress(contact));if(current!==revision)return false;
  checkout=next;actions=nextActions;
  const session=actions.getSession();
  if(session.tax&&session.tax.status!=='ready')throw Error('Tax could not be calculated. Please check your delivery address.');
  const totals=session.total;
  if(!totals?.total||!Number.isInteger(totals.total.minorUnitsAmount))throw Error('Your total could not be confirmed. Please retry.');
  const format=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:session.currency}).format(n/session.minorUnitsAmountDivisor);
  const box=node('payment-totals');box.replaceChildren();
  for(const [label,value] of [['Items',totals.subtotal],['Discount',totals.discount],['Shipping',totals.shippingRate],['Tax',totals.taxExclusive],['Total',totals.total]]){if(!value)continue;const row=document.createElement('p'),name=document.createElement('span'),amount=document.createElement('strong');name.textContent=label;amount.textContent=(label==='Discount'?'−':'')+format(value.minorUnitsAmount);row.append(name,amount);box.append(row)}
  node('pay-order').textContent='Pay '+format(totals.total.minorUnitsAmount);
  node('recurring-payment-terms').textContent=session.recurring?'This starts a recurring subscription at your selected delivery frequency. Renews until canceled. Manage or cancel in your account.':'';
  node('payment-review').hidden=false;node('pay-order').hidden=false;node('billing-address').hidden=true;
  async function confirm(walletEvent){
   if(paying||!actions||current!==revision)return;
   paying=true;onBusy(true);node('payment-error').textContent='';
   try{
    let paymentMethod;
    if(!walletEvent){const result=await stripe.createPaymentMethod({type:'card',card,billing_details:{...contact,email:node('payment-email').value.trim()}});if(result.error)throw Error(result.error.message);paymentMethod=result.paymentMethod.id}
    if(current!==revision)throw Error('Delivery changed. Please review your updated total.');
    checked(await nextActions.confirm({... (walletEvent?{expressCheckoutConfirmEvent:walletEvent}:{paymentMethod}),redirect:'always'}));
   }catch(e){node('payment-error').textContent=e.message;if(walletEvent)walletEvent.paymentFailed({reason:'fail'})}
   finally{paying=false;onBusy(false)}
  }
  node('pay-order').onclick=()=>confirm();
  wallet=checkout.createExpressCheckoutElement({paymentMethods:{applePay:'auto',googlePay:'auto',link:'never',paypal:'never',amazonPay:'never',klarna:'never'}});
  wallet.on('confirm',e=>confirm(e));wallet.on('ready',e=>{if(current!==revision)return;node('wallet-note').textContent=Object.values(e.availablePaymentMethods||{}).some(Boolean)?'You can also pay with an available wallet above.':'Apple Pay or Google Pay will appear on supported devices with a configured wallet.'});wallet.mount('#wallet-payment');
  return true;
  }catch(error){if(current===revision)reset();throw error}
 }
 return {start,prepare,reset,destroy};
})();
