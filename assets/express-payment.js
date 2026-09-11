'use strict';
window.BeanBrosExpress=(()=>{
 let stripe,elements,wallet,generation=0,busy=false,currentCallbacks,readyTimer;
 const node=id=>document.getElementById(id);
 function destroy(){clearTimeout(readyTimer);generation++;currentCallbacks?.busy(false);currentCallbacks=null;if(wallet)wallet.destroy();wallet=null;elements=null;stripe=null;busy=false;node('wallet-primary').replaceChildren()}
 function destination(value){const a=value?.address||value||{};return {name:value?.name||'',address:a.line1||'',address2:a.line2||'',city:a.city||'',state:a.state||'',zip:a.postal_code||'',country:a.country||'US',residential:true}}
 function checked(result){if(result.type==='error'||result.error)throw Error(result.error?.message||'Payment could not be completed.');return result}
 async function start(key,callbacks){
  destroy();currentCallbacks=callbacks;const current=generation;
  const initial=callbacks.initial||await callbacks.request({action:'wallet-start'});if(current!==generation)return;
  node('express-terms').textContent=initial.recurring?'Your subscription renews every '+(initial.frequency==='biweekly'?'2':'4')+' weeks until canceled. Shipping and tax are shown in your wallet. Manage or cancel in your account.':'';
  stripe=window.Stripe(key);elements=stripe.elements({mode:initial.recurring?'subscription':'payment',amount:initial.amount,currency:'usd',paymentMethodTypes:['card'],paymentMethodCreation:'manual'});
  let quote=null,address=null,service=null,acceptedPromo='',quoteRevision=0;
  const pending=[{id:'pending',displayName:'Select an address for shipping',amount:0}];
  const rates=q=>q.options.map(o=>({id:o.serviceCode,displayName:o.displayName,amount:o.amountCents}));
  wallet=elements.create('expressCheckout',{paymentMethods:{applePay:'always',googlePay:'always',link:'never',paypal:'never',amazonPay:'never',klarna:'never'},buttonHeight:50,layout:{maxColumns:2,maxRows:1},emailRequired:true,billingAddressRequired:true,shippingAddressRequired:true,allowedShippingCountries:['US'],shippingRates:pending});
  function error(message){node('express-error').textContent=message}
  async function update(event,shipping){
   const requestRevision=++quoteRevision;quote=null;
   try{
    const promo=callbacks.promo();const next=await callbacks.request({action:'wallet-quote',shipTo:address,shippingService:shipping,promoCode:promo});
    if(current!==generation||requestRevision!==quoteRevision){event.reject();return}
    if(next.total<=0)throw Error('Use manual checkout for an order with no payment due.');
    quote=next;service=next.selectedService;acceptedPromo=promo;elements.update({amount:next.total});event.resolve({shippingRates:rates(next),lineItems:next.lineItems});
   }catch(e){quote=null;error(e.message);event.reject()}
  }
  wallet.on('ready',e=>{clearTimeout(readyTimer);if(current!==generation)return;node('wallet-retry').hidden=true;const available=e.availablePaymentMethods||{};const any=!!(available.applePay||available.googlePay);node('wallet-note').textContent=any?'Use your saved payment and delivery details.':'Wallets aren’t available in this browser. Open this page in Safari or Chrome, or enter your details below.';if(!any)callbacks.unavailable()});
  wallet.on('click',e=>{quote=null;service=null;address=null;error('');callbacks.busy(true);e.resolve({shippingRates:pending,lineItems:initial.items});});
  wallet.on('shippingaddresschange',e=>{address=destination(e.address);return update(e,service)});
  wallet.on('shippingratechange',e=>update(e,e.shippingRate.id));
  wallet.on('cancel',()=>{quote=null;service=null;address=null;elements.update({amount:initial.amount});callbacks.busy(false)});
  wallet.on('confirm',async e=>{
   if(busy)return;
   let finalShipping,finalBilling;
   busy=true;callbacks.busy(true);error('');
   try{
    if(!quote||!service||callbacks.promo()!==acceptedPromo)throw Error('Please reopen the wallet to refresh shipping and your total.');
    const shipping=destination(e.shippingAddress),billing=e.billingDetails;finalShipping=shipping;finalBilling=billing;
    if(!billing?.email||!shipping.name||!shipping.address)throw Error('Choose a complete delivery address and email in your wallet.');
    checked(await elements.submit());
    const method=checked(await stripe.createPaymentMethod({elements}));
    if(current!==generation)return;
    const data=await callbacks.request({paymentFirst:true,shipTo:shipping,shippingService:service,shippingAmount:quote.options.find(o=>o.serviceCode===service).amountCents,promoCode:acceptedPromo,successUrl:location.origin+'/#/checkout-success',cancelUrl:location.origin+'/#/cart'});
    if(current!==generation)return;
    const checkout=(stripe.initCheckoutElementsSdk||stripe.initCheckout).call(stripe,{clientSecret:data.clientSecret});
    const {actions}=checked(await checkout.loadActions());
    checked(await actions.updateEmail(billing.email));
    checked(await actions.updateBillingAddress({name:billing.name||shipping.name,address:billing.address||{line1:shipping.address,line2:shipping.address2,city:shipping.city,state:shipping.state,postal_code:shipping.zip,country:'US'}}));
    const session=actions.getSession();
    if(session.currency!=='usd'||session.total?.total?.minorUnitsAmount!==quote.total||session.tax&&session.tax.status!=='ready')throw Object.assign(Error('Your delivery total changed. Please review the updated total below before paying.'),{status:409});
    if(current!==generation)return;
    callbacks.remember(data);
    checked(await actions.confirm({paymentMethod:method.paymentMethod.id,redirect:'always'}));
   }catch(err){error(err.message);e.paymentFailed({reason:err.status===422?'invalid_shipping_address':'fail'});if([409,422].includes(err.status)&&finalShipping){callbacks.busy(false);callbacks.fallback?.(finalShipping,finalBilling,err)}}
   finally{busy=false;callbacks.busy(false)}
  });
  const failed=()=>{if(current!==generation)return;clearTimeout(readyTimer);node('wallet-note').textContent='Express checkout is taking longer than expected. Retry or use the form below.';node('wallet-retry').hidden=false;callbacks.unavailable()};
  wallet.on('loaderror',failed);readyTimer=setTimeout(failed,15000);
  wallet.mount('#wallet-primary');
 }
 return {start,destroy};
})();
