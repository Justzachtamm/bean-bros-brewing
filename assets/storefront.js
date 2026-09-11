'use strict';
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grindLabels={'whole-bean':'Whole Bean',espresso:'Espresso',drip:'Drip','pour-over':'Pour Over','french-press':'French Press','cold-brew':'Cold Brew'};
let products=[],bag=[],currentProduct=null,filter='all',threshold=null,checkingOut=false,loaded=false;
const storage={get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v);return true}catch{return false}}};
function token(){try{return localStorage.getItem('bb_token')||''}catch{return ''}}
// Purge only obsolete insecure storage from historical storefront versions.
for(const k of ['bb_admin_pw','bb_users','bb_session']){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch{}}
async function api(path,body){const headers={'Content-Type':'application/json'};if(body&&token())headers.Authorization='Bearer '+token();const response=await fetch('/.netlify/functions/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(30000)});let data;try{data=await response.json()}catch{throw Error('We could not reach the store. Please try again.')};if(!response.ok){const err=Error(data.error||'Please try again in a moment.');err.status=response.status;err.candidates=data.candidates;throw err}return data}
function isHerb(p){return ['tea','herbs'].includes(p.category)}
function imageURL(p){if(p.imageKey)return '/.netlify/functions/image?key='+encodeURIComponent(p.imageKey);if(p.id>=900001&&p.id<=900033)return '/collections/assets/herbs/herb-'+String(p.id-900001).padStart(2,'0')+'-front.png';return p.imageKey?'/.netlify/functions/image?key='+encodeURIComponent(p.imageKey):(window.BeanBrosBrand.productImages[p.id]||window.BeanBrosBrand.markLight)}
function openDialog(id){if(!$(id).open)$(id).showModal();document.body.classList.add('dialog-open')}
function closeDialog(d){d.close();if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open')}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d)}});d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open')})});
function info(title,body){$('info-label').textContent='BEAN BROS BREWING';$('info-title').textContent=title;$('info-body').innerHTML=body;openDialog('info-dialog')}
function account(){location.assign('/account.html#account')}
function persist(){storage.set('bb_cart',JSON.stringify(bag))}
function restoreBag(){try{const saved=JSON.parse(storage.get('bb_cart')||'[]');if(!Array.isArray(saved))return;bag=saved.flatMap(i=>{const p=products.find(p=>p.id===i.product?.id);if(!p||!p.active||!Number.isInteger(i.quantity)||i.quantity<1||(!isHerb(p)&&!grindLabels[i.grind]))return [];const sub=i.isSubscription===true;if(sub&&!['biweekly','monthly'].includes(i.frequency))return [];return [{id:[p.id,i.grind,sub,sub?i.frequency:null].join(':'),product:p,quantity:Math.min(i.quantity,50),grind:i.grind,grindLabel:isHerb(p)?p.weight:grindLabels[i.grind],isSubscription:sub,frequency:sub?i.frequency:null,frequencyLabel:sub?(i.frequency==='biweekly'?'Every 2 weeks':'Every 4 weeks'):null}]})}catch{bag=[]}}
function renderProducts(){const list=products.filter(p=>p.active&&!isHerb(p)&&(filter==='all'||p.roast?.toLowerCase().includes(filter)));$('coffee-count').textContent=products.filter(p=>p.active&&!isHerb(p)).length;$('result-count').textContent=list.length+' coffees to discover.';$('products').innerHTML=list.length?list.map(p=>`<article class="product-card"><button type="button" class="product-image product-photo-button" data-photo-product="${p.id}" aria-label="View photos and details for ${escapeHTML(p.name.trim())}">${p.badge?`<span class="badge">${escapeHTML(p.badge)}</span>`:''}<img src="${imageURL(p)}" alt="${escapeHTML(p.name.trim())} coffee bag" loading="lazy"><span class="roast-chip">${escapeHTML(p.roast||'Coffee')}</span></button><div class="product-topline"><span>${escapeHTML(p.origin||'Bean Bros')}</span><span>${escapeHTML(p.weight||'16 oz')}</span></div><h3><a href="/products/${p.id}/">${escapeHTML(p.name.trim())}</a></h3><p class="tasting-notes">${escapeHTML(p.tastingNotes||'')}</p><div class="product-bottom"><span class="price">${money(p.price)}<small>${money(Math.round(p.price*.9*100)/100)} with subscription</small></span><button class="choose-button" data-product="${p.id}" ${p.stock<1?'disabled':''} aria-label="Choose options for ${escapeHTML(p.name.trim())}">${p.stock<1?'Sold out':'Choose options +'}</button></div></article>`).join(''):'<p class="empty-bag">No coffees in this selection right now. Try another roast.</p>';$('products').querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>showProduct(Number(b.dataset.product)))}
function showProduct(id,subscription=false){currentProduct=products.find(p=>p.id===id&&p.active);if(!currentProduct)return;$('product-form').reset();$('option-image').src=imageURL(currentProduct);$('option-image').alt=currentProduct.name;$('option-origin').textContent=currentProduct.origin||'Bean Bros';$('option-name').textContent=currentProduct.name.trim();$('option-notes').textContent=currentProduct.tastingNotes||'';$('option-bio').textContent=currentProduct.bio||'';$('option-roast').textContent=currentProduct.roast||'';$('option-weight').textContent=currentProduct.weight||'16 oz';$('once-price').textContent=money(currentProduct.price);$('sub-price').textContent=money(Math.round(currentProduct.price*.9*100)/100);$('quantity').max=Math.min(50,currentProduct.stock);document.querySelector(`input[name="purchase"][value="${subscription?'subscription':'once'}"]`).checked=true;configureHerbOptions();renderPhotoGallery();$('product-form').querySelector('[type="submit"]').disabled=currentProduct.stock<1;updateOptionPrice();openDialog('product-dialog');globalThis.window?.BeanBrosAnalytics?.track('view_item',[{product:currentProduct,quantity:1,isSubscription:subscription}]);loadProductReviews(currentProduct.id)}
function updateOptionPrice(){if(!currentProduct)return;const recurring=document.querySelector('input[name="purchase"]:checked').value==='subscription';$('cadence-wrap').hidden=!recurring;$('add-price').textContent=money(Math.round(currentProduct.price*(recurring?.9:1)*100)/100*(Number($('quantity').value)||1))}
let shippingQuote=null,shippingBusy=false,paymentReady=false,paymentRevision=0,preparingPayment=false;
function resetPayment(){paymentRevision++;window.BeanBrosPayment.reset();paymentReady=false;$('edit-delivery').hidden=true;$('checkout-live').hidden=false;}
$('delivery-dialog').addEventListener('close',()=>{clearTimeout(checkoutTimer);autoCheckoutKey='';window.BeanBrosExpress.destroy();resetPayment();window.BeanBrosPayment.destroy();renderBag()});
$('billing-same').onchange=()=>{$('billing-address').hidden=$('billing-same').checked;resetPayment();renderBag()};
$('payment-email').oninput=()=>{resetPayment();renderBag()};
$('edit-delivery').onclick=()=>{resetPayment();renderBag();$('shipping-form').elements.namedItem('name').focus()};
function checkoutItems(){return bag.map(i=>({name:i.product.name,quantity:i.quantity,grind:i.grind,grindLabel:i.grindLabel,isSubscription:i.isSubscription,frequency:i.frequency,frequencyLabel:i.frequencyLabel}));}
function deliveryAddress(){const f=$('shipping-form').elements;return {...Object.fromEntries(['name','address','address2','city','state','zip'].map(k=>[k,f.namedItem(k)?.value||''])),country:'US',residential:f.namedItem('location')?.value!=='business'};}
function quoteKey(){return JSON.stringify({items:checkoutItems(),address:deliveryAddress()});}
function clearShipping(){resetPayment();shippingQuote=null;$('shipping-options').hidden=true;$('shipping-choices').innerHTML='';$('shipping-status').textContent='';$('address-suggestions').replaceChildren();}
$('shipping-form').addEventListener('input',e=>{if(e.target.name!=='shippingService'){clearShipping();renderBag();}});
$('shipping-form').onsubmit=async e=>{e.preventDefault();if(shippingBusy||checkingOut||!bag.length)return;const key=quoteKey();clearShipping();shippingBusy=true;$('get-shipping').disabled=true;$('shipping-status').textContent='Checking UPS rates…';try{const d=await api('create-checkout-session',{action:'quote',items:checkoutItems(),shipTo:deliveryAddress()});if(key!==quoteKey())return;shippingQuote={key,options:d.options,recurring:d.recurring};$('shipping-choices').innerHTML=d.options.map((o,n)=>`<label class="shipping-choice"><input type="radio" name="shippingService" value="${escapeHTML(o.serviceCode)}" ${n===0?'checked':''}><span>${escapeHTML(o.displayName)} · ${money(o.amountCents/100)}${d.recurring?' per delivery':''}</span></label>`).join('');$('shipping-options').hidden=false;$('shipping-status').textContent=d.recurring?'This shipping amount repeats with each subscription delivery.':'Address verified by UPS. Shipping uses your packed shipment measurements.';renderBag();}catch(e){showAddressSuggestions(e.candidates);$('shipping-status').textContent=e.message;if(e.status===401||e.status===403)$('shipping-status').innerHTML=escapeHTML(e.message)+' <a href="/account.html#account">Open your account →</a>';}finally{shippingBusy=false;$('get-shipping').disabled=false;}};
$('shipping-choices').onchange=()=>{resetPayment();renderBag();scheduleCheckout()};
function renderBag(){const locked=checkingOut&&!preparingPayment;$('delivery-dialog').querySelector('[aria-label="Close checkout"]').disabled=locked;$('email-subscription-news').disabled=locked;$('email-promotions').disabled=locked;renderRecommendations();$('promo-code').disabled=locked;$('payment-email').disabled=locked;$('billing-same').disabled=locked;$('edit-delivery').disabled=locked;$('pay-order').disabled=locked;$('back-to-bag').disabled=locked;$('shipping-form').querySelectorAll('input,select,button').forEach(el=>el.disabled=locked||(el.id==='get-shipping'&&shippingBusy));if(shippingQuote&&shippingQuote.key!==quoteKey())clearShipping();const count=bag.reduce((a,i)=>a+i.quantity,0),total=bag.reduce((a,i)=>a+Math.round(subscriptionItemPrice(i.product,i.isSubscription)*100)*i.quantity,0)/100;$('bag-count').textContent=count;$('cart-open').setAttribute('aria-label',`Open bag, ${count} items`);$('drawer-count').textContent=' ('+count+')';$('shipping-progress').hidden=threshold===null;$('shipping-progress').max=threshold||1;$('shipping-progress').value=Math.min(total,threshold||0);$('shipping-message').textContent=threshold===null?'Shipping confirmed at checkout.':total>=threshold?'Your order qualifies for free standard shipping.':money(threshold-total)+' away from free standard shipping.';$('cart-items').innerHTML=bag.length?bag.map((i,n)=>`<article class="cart-item"><img src="${imageURL(i.product)}" alt=""><div><h3>${escapeHTML(i.product.name.trim())}</h3><p>${escapeHTML(i.grindLabel)}</p><p>${i.isSubscription?escapeHTML(i.frequencyLabel)+((i.product.category||'coffee')==='coffee'?' · 10% off':''):'One-time purchase'}</p><label>Qty <input class="cart-quantity" aria-label="Quantity for ${escapeHTML(i.product.name)}" type="number" min="1" max="${Math.min(50,i.product.stock)}" value="${i.quantity}" data-quantity="${n}" ${checkingOut?'disabled':''}></label><button class="remove-item" data-remove="${n}" ${checkingOut?'disabled':''}>Remove</button></div><strong>${money(Math.round(subscriptionItemPrice(i.product,i.isSubscription)*100)*i.quantity/100)}</strong></article>`).join(''):'<p class="empty-bag">Your next favorite coffee belongs here. Choose a bag to get started.</p>';
 const subs=bag.filter(i=>i.isSubscription),mixed=subs.length&&subs.length!==bag.length,cadences=new Set(subs.map(i=>i.frequency)),overstock=products.some(p=>bag.filter(i=>i.product.id===p.id).reduce((n,i)=>n+i.quantity,0)>p.stock);
 $('cart-warning').textContent=mixed?'Please check out subscriptions and one-time coffees separately.':cadences.size>1?'Choose the same delivery frequency for all subscription coffees.':overstock?'One or more quantities exceed available stock. Please reduce the quantity.':'';$('cart-total').textContent=money(total);$('cart-shipping').textContent=threshold!==null&&total>=threshold?'Standard shipping free':shippingQuote?money((shippingQuote.options.find(o=>o.serviceCode===$('shipping-form').elements.shippingService?.value)||shippingQuote.options[0]).amountCents/100)+(shippingQuote.recurring?' per delivery':''):'Enter your address for rates';$('checkout-live').disabled=!loaded||!bag.length||!!mixed||cadences.size>1||overstock||checkingOut||paymentReady||!shippingQuote;$('begin-checkout').disabled=!loaded||!bag.length||!!mixed||cadences.size>1||overstock||checkingOut;
 $('cart-items').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{bag.splice(Number(b.dataset.remove),1);persist();renderBag()});$('cart-items').querySelectorAll('[data-quantity]').forEach(input=>input.onchange=()=>{const n=Number(input.value),i=bag[Number(input.dataset.quantity)];if(Number.isInteger(n)&&n>0&&n<=Math.min(50,i.product.stock))i.quantity=n;persist();renderBag()})}
$('product-form').addEventListener('change',updateOptionPrice);$('quantity').addEventListener('input',updateOptionPrice);
$('product-form').addEventListener('submit',e=>{e.preventDefault();const quantity=Number($('quantity').value);if(!currentProduct||currentProduct.stock<1)return;if(!Number.isInteger(quantity)||quantity<1||quantity>50)return;const existingCount=bag.filter(i=>i.product.id===currentProduct.id).reduce((n,i)=>n+i.quantity,0);if(existingCount+quantity>currentProduct.stock){info('A little less is available.',`<p>There are ${currentProduct.stock} bags available, including any already in your bag.</p>`);return}const isSubscription=document.querySelector('input[name="purchase"]:checked').value==='subscription',grind=$('grind').value,frequency=isSubscription?$('cadence').value:null,id=[currentProduct.id,grind,isSubscription,frequency].join(':');const existing=bag.find(i=>i.id===id);if(existing)existing.quantity+=quantity;else bag.push({id,product:currentProduct,quantity,grind,grindLabel:isHerb(currentProduct)?currentProduct.weight:grindLabels[grind],isSubscription,frequency,frequencyLabel:frequency==='biweekly'?'Every 2 weeks':frequency==='monthly'?'Every 4 weeks':null});globalThis.window?.BeanBrosAnalytics?.track('add_to_cart',[{product:currentProduct,quantity,isSubscription}]);persist();closeDialog($('product-dialog'));renderBag();openDialog('cart-dialog')});
$('checkout-live').onclick=async()=>{
 if(checkingOut||$('checkout-live').disabled)return;
 const selectedShipping=shippingQuote?.options.find(o=>o.serviceCode===$('shipping-form').elements.namedItem('shippingService')?.value);
 if(!selectedShipping){clearShipping();renderBag();$('shipping-status').textContent='Please get shipping rates and choose a delivery service.';return}
 if(!$('payment-email').reportValidity())return;const revision=paymentRevision;checkingOut=true;renderBag();$('checkout-live').textContent='Confirming your total…';$('delivery-warning').textContent='';
 try{
  if(bag.some(i=>i.isSubscription)&&!token()){persist();account();return}
  const data=await api('create-checkout-session',{paymentFirst:true,emailConsent:checkoutEmailConsent(),promoCode:$('promo-code')?.value.trim()||'',measurement:globalThis.window?.BeanBrosAnalytics?.checkoutContext(),items:checkoutItems(),shipTo:deliveryAddress(),shippingService:selectedShipping.serviceCode,shippingAmount:selectedShipping.amountCents,successUrl:location.origin+'/#/checkout-success',cancelUrl:location.origin+'/#/cart'});
  if(revision!==paymentRevision)return;
  if(!data.clientSecret||!/^pk_(test|live)_/.test(data.publishableKey)||!data.sessionId||!data.receiptToken)throw Error('Secure payment could not be opened. Please try again.');
  if(!storage.set('bb_pending_order',JSON.stringify({items:bag.map(i=>({name:i.product.name,quantity:i.quantity})),sessionId:data.sessionId,receiptToken:data.receiptToken})))throw Error('Please allow browser session storage to continue to payment.');
  if(await window.BeanBrosPayment.prepare(data,deliveryAddress(),busy=>{checkingOut=busy;renderBag()})){
   paymentReady=true;$('payment-placeholder').hidden=true;$('checkout-live').hidden=true;$('edit-delivery').hidden=false;
   globalThis.window?.BeanBrosAnalytics?.track('begin_checkout',bag);
  }
 }catch(e){if(revision!==paymentRevision)return;if([409,422].includes(e.status))clearShipping();if(e.status===422)showAddressSuggestions(e.candidates);$('delivery-warning').textContent=e.name==='TimeoutError'?'The payment service took too long to respond. Please try again.':e.message;if(e.status===401||e.status===403)$('delivery-warning').innerHTML=escapeHTML(e.message)+' <a href="/account.html#account">Open your account →</a>'}
 finally{checkingOut=false;renderBag();$('checkout-live').textContent='Checkout · review total'}
};
$('begin-checkout').onclick=async()=>{
 renderBag();if($('begin-checkout').disabled)return;if(bag.some(i=>i.isSubscription)&&!token()){persist();account();return}closeDialog($('cart-dialog'));$('delivery-warning').textContent='';openDialog('delivery-dialog');$('manual-checkout').hidden=true;$('wallet-primary').after($('checkout-email-options'));$('wallet-retry').hidden=true;$('wallet-note').textContent='Loading Apple Pay and Google Pay…';$('express-error').textContent='';const revision=paymentRevision;$('payment-placeholder').hidden=false;$('payment-placeholder').textContent='Loading secure card fields…';
 try{const [config,initial]=await Promise.all([api('payment-config'),api('create-checkout-session',{action:'wallet-start',items:checkoutItems()})]);if(revision!==paymentRevision||!$('delivery-dialog').open)return;if(await window.BeanBrosPayment.start(config.publishableKey,{wallets:false,...initial,onAddress:syncDeliveryAutocomplete})){ $('payment-placeholder').hidden=true;
   await window.BeanBrosExpress.start(config.publishableKey,{initial,
    request:body=>api('create-checkout-session',{...body,emailConsent:checkoutEmailConsent(),items:checkoutItems(),measurement:globalThis.window?.BeanBrosAnalytics?.checkoutContext()}),
    promo:()=>$('promo-code').value.trim(),busy:value=>{checkingOut=value;renderBag()},
    unavailable:()=>{showManualCheckout();scheduleCheckout()},
    fallback:(address,billing,error)=>{for(const k of ['name','address','address2','city','state','zip'])$('shipping-form').elements.namedItem(k).value=address[k]||'';$('payment-email').value=billing?.email||'';window.BeanBrosPayment.setAddress(address);showManualCheckout();clearShipping();showAddressSuggestions(error?.candidates);$('shipping-status').textContent=error?.message||'';autoEditVersion++;autoCheckoutKey='';renderBag();if(error?.status!==422)scheduleCheckout()},
    remember:data=>{if(!storage.set('bb_pending_order',JSON.stringify({items:bag.map(i=>({name:i.product.name,quantity:i.quantity})),sessionId:data.sessionId,receiptToken:data.receiptToken})))throw Error('Please allow browser session storage to continue to payment.')}
   }); }}
 catch(e){$('wallet-note').textContent='Express checkout could not load.';$('wallet-retry').hidden=false;$('payment-placeholder').textContent=e.message;$('express-error').textContent=e.message;showManualCheckout()}
};
$('back-to-bag').onclick=()=>{closeDialog($('delivery-dialog'));renderBag();openDialog('cart-dialog')};
$('cart-open').onclick=()=>{renderBag();openDialog('cart-dialog')};$('account-open').onclick=account;$('account-mobile').onclick=account;$('subscribe-start').onclick=showSubscriptionBuilder;
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});renderProducts()});
document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>{if(b.dataset.info==='shipping')location.assign('/shipping-returns.html');else info('A direct line to Bean Bros.','<p>Questions about your coffee or an order?</p><p><a href="mailto:hello@beanbrosbrewingco.com">hello@beanbrosbrewingco.com</a></p>')});
$('menu-open').onclick=()=>{const open=$('navigation').classList.toggle('open');$('menu-open').setAttribute('aria-expanded',String(open))};$('navigation').querySelectorAll('a').forEach(a=>a.onclick=()=>{$('navigation').classList.remove('open');$('menu-open').setAttribute('aria-expanded','false')});
function route(){const requested=Number(new URLSearchParams(location.search).get('product'));if(loaded&&requested&&products.some(p=>p.id===requested&&p.active)){showProduct(requested);history.replaceState(null,'',location.pathname+location.hash)}const hash=location.hash.replace(/^#\/?/,'');if(hash==='admin')location.replace('/admin.html');else if(['account','login','signup','checkout-success','subscriptions','orders'].includes(hash))location.replace('/account.html'+location.search+location.hash);else if(hash==='cart')openDialog('cart-dialog');else if(hash==='shop')location.hash='#coffee'}
window.addEventListener('hashchange',route);route();
async function load(){try{const list=await api('products');if(!Array.isArray(list))throw Error('The collection is temporarily unavailable.');products=list.filter(p=>Number.isSafeInteger(p.id)&&typeof p.name==='string'&&Number.isFinite(p.price)&&Number.isInteger(p.stock));loaded=true;restoreBag();renderProducts();renderHerbs();persist();renderBag();route()}catch(e){$('result-count').textContent='The collection could not load.';$('products').innerHTML='<div class="empty-bag"><p>'+escapeHTML(e.message)+'</p><button id="retry-catalog" class="button dark">Try again</button></div>';$('retry-catalog').onclick=load}try{const c=await api('public-shipping-config');if(Number.isFinite(c.freeShipThreshold)&&c.freeShipThreshold>0){threshold=c.freeShipThreshold;document.querySelectorAll('[data-shipping-copy]').forEach(el=>el.textContent='Free standard shipping on orders '+money(threshold)+'+');renderBag()}}catch{}}
renderBag();load();

function renderHerbs(){const list=products.filter(p=>isHerb(p)&&p.active);$('herb-products').innerHTML=list.length?list.map(p=>`<article class="product-card"><button type="button" class="product-image product-photo-button" data-photo-product="${p.id}" aria-label="View photos and details for ${escapeHTML(p.name.trim())}"><img src="${imageURL(p)}" alt="${escapeHTML(p.name)} package" loading="lazy"></button><div class="product-topline"><span>Herbs & tea</span><span>${escapeHTML(p.weight)}</span></div><h3>${escapeHTML(p.name)}</h3><p class="tasting-notes">${escapeHTML(p.tastingNotes)}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="choose-button" data-herb="${p.id}" ${p.stock<1?'disabled':''}>${p.stock<1?'Sold out':'Choose options +'}</button></div></article>`).join(''):'<p>Herbs and teas will be available shortly.</p>';document.querySelectorAll('[data-herb]').forEach(b=>b.onclick=()=>showProduct(Number(b.dataset.herb)))}
function configureHerbOptions(){const herb=isHerb(currentProduct),nonCoffee=(currentProduct.category||'coffee')!=='coffee',form=$('product-form');const grind=$('grind');if(grind){form.querySelector('label[for="grind"]').hidden=nonCoffee;grind.hidden=nonCoffee;grind.disabled=nonCoffee;grind.value='whole-bean'}const sub=form.querySelector('[value="subscription"]');if(sub){sub.disabled=nonCoffee;sub.closest('label').hidden=nonCoffee}if(nonCoffee)form.querySelector('[value="once"]').checked=true;let gallery=$('herb-original');if(gallery)gallery.remove();if(herb){gallery=document.createElement('p');gallery.id='herb-original';gallery.innerHTML='<button type="button" id="herb-front">Front package</button> · <button type="button" id="herb-back">Back package</button>';form.append(gallery);$('herb-front').onclick=()=>{$('option-image').hidden=false;document.getElementById('herb-back-view')?.remove()};$('herb-back').onclick=()=>{const p=window.BEAN_HERB_DETAILS[currentProduct.id];if(!p)return;$('option-image').hidden=true;document.getElementById('herb-back-view')?.remove();const view=document.createElement('div');view.id='herb-back-view';view.innerHTML=p.backLabel?`<img src="/collections/${escapeHTML(p.backLabel)}" alt="${escapeHTML(p.name)} back sticker"><p>Back sticker</p>`:p.backKind==='source'?`<img src="/collections/${p.images[1]||p.images[0]}" alt="${escapeHTML(p.name)} original back packaging"><p>Original listing · back packaging</p>`:`<div class="botanical-back"><img src="/collections/assets/back-template.png" alt="Back packaging mockup"><div><b>BEAN BROS</b><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.subtitle)}</p><p>${escapeHTML(p.prep||'')}</p><b>${escapeHTML(p.size)}</b><p>BACK PACKAGING MOCKUP</p></div></div><p>Back packaging mockup · Based on listing text</p>`;$('option-image').parentElement.append(view)}}$('option-image').hidden=false;document.getElementById('herb-back-view')?.remove()}
async function loadProductReviews(id){
 let box=$('product-reviews');if(!box){box=document.createElement('section');box.id='product-reviews';box.className='review-list';$('product-form').append(box)}
 box.innerHTML='<h3>Customer reviews</h3><p>Loading reviews…</p>';
 try{
  const d=await api('reviews?productId='+id);if(currentProduct?.id!==id)return;
  const local=(d.reviews||[]).map(r=>`<article><b>${'★'.repeat(r.rating)} · ${escapeHTML(r.display_name)}</b><p>${escapeHTML(r.body)}</p><small>Verified purchase · Approved review</small></article>`).join('');
  const imported=(d.whatnotReviews||[]).map(r=>`<article><p>${escapeHTML(r.context)}</p><blockquote>“${escapeHTML(r.body)}”</blockquote><p><strong>${escapeHTML(r.display_name)}</strong> · <time datetime="${escapeHTML(r.date)}">${escapeHTML(r.date)}</time></p><a href="https://www.whatnot.com/user/beanbros/reviews" target="_blank" rel="noopener noreferrer">Read reviews on Whatnot ↗</a></article>`).join('');
  box.innerHTML='<h3>Customer reviews</h3>'+(imported?'<div class="whatnot-reviews"><h4>From our Whatnot customers</h4><p>Selected excerpts from reviews on our Whatnot shop.</p>'+imported+'</div>':'')+(local?'<h4>Website purchases</h4>'+local:!imported?'<p>No approved reviews yet. Be the first to share your experience after your order arrives.</p>':'')+'<p><a href="/account.html">Review a purchased product from your account ↗</a></p>';
 }catch{if(currentProduct?.id===id)box.innerHTML='<h3>Customer reviews</h3><p>Reviews are temporarily unavailable.</p>'}
}

document.addEventListener('click',e=>{const button=e.target.closest('[data-photo-product]');if(button)showProduct(Number(button.dataset.photoProduct));});
function renderPhotoGallery(){
 const p=currentProduct,detail=window.BEAN_HERB_DETAILS?.[p.id],photos=[{src:imageURL(p),label:'Front package'}];
 if(detail?.backLabel)photos.push({src:'/collections/'+detail.backLabel,label:'Back sticker'});
 const brand=window.BeanBrosBrand.productImages[p.id];if(brand&&!photos.some(x=>x.src===brand))photos.push({src:brand,label:'Package photo'});
 for(const [i,path] of (detail?.images||[]).entries()){const src='/collections/'+path;if(!photos.some(x=>x.src===src))photos.push({src,label:detail.backKind==='source'&&i===1?'Back package':'Listing photo '+(i+1)});}
 if(detail?.backKind==='mockup')photos.push({mockup:true,src:'/collections/assets/back-template.png',label:'Back packaging mockup'});
 const old=$('herb-original');if(old)old.hidden=true;
 $('product-gallery').innerHTML=photos.map((x,i)=>`<button type="button" data-gallery-photo="${i}" aria-label="${escapeHTML(x.label)}" aria-pressed="${i===0}"><img src="${x.src}" alt=""><span>${escapeHTML(x.label)}</span></button>`).join('');
 function select(i){const photo=photos[i];$('option-image').hidden=!!photo.mockup;$('herb-back-view')?.remove();if(photo.mockup)$('herb-back')?.click();else{$('option-image').src=photo.src;$('option-image').alt=p.name+' — '+photo.label;}$('gallery-caption').textContent=photo.label+(photo.mockup?' · Based on listing text':'');$('product-gallery').querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));}
 $('product-gallery').querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.galleryPhoto)));select(0);
}

function recommendedProducts(catalog,cart){
 const coffee=p=>(p.category||'coffee')==='coffee';
 if(!cart.some(i=>coffee(i.product)))return [];
 const recurring=cart.some(i=>i.isSubscription),ids=new Set(cart.map(i=>i.product.id));
 const available=catalog.filter(p=>p.active&&p.stock>0&&!ids.has(p.id)&&(!recurring||coffee(p)));
 const description=p=>[p.name,p.tastingNotes,p.bio].join(' ').toLowerCase();
 const groups=[available.filter(coffee),available.filter(p=>!coffee(p)&&/reishi/.test(description(p))).sort((a,b)=>Number(/reishi/i.test(b.name))-Number(/reishi/i.test(a.name))),available.filter(p=>!coffee(p)&&/lion[’']?s?\s*mane/.test(description(p))),available.filter(p=>p.category==='merch')];
 const selected=[];for(const group of groups){const p=group.find(p=>!selected.some(x=>x.id===p.id));if(p)selected.push(p)}
 for(const p of groups[0])if(selected.length<4&&!selected.some(x=>x.id===p.id))selected.push(p);
 return selected;
}
function renderRecommendations(){
 renderCartMushrooms();
 const mushroomIds=new Set(subscriptionChoices(products).mushrooms.map(p=>p.id));
 const box=$('cart-recommendations'),list=recommendedProducts(products,bag).filter(p=>!mushroomIds.has(p.id));box.hidden=!list.length;
 if(!list.length){box.innerHTML='';return}
 const subscription=bag.find(i=>i.isSubscription);
 box.innerHTML=`<h3 id="recommendation-title">You might also like</h3><p>${subscription?'Another coffee for your next delivery.':'Try another roast, explore our mushrooms, or find a little Bean Bros merch.'}</p><div class="cart-suggestions">${list.map(p=>`<article><img src="${imageURL(p)}" alt="${escapeHTML(p.name)}"><div><h4>${escapeHTML(p.name)}</h4><span>${money(Math.round(p.price*(subscription?.9:1)*100)/100)}${subscription?' per delivery':''}</span><button type="button" data-recommendation="${p.id}" ${checkingOut?'disabled':''}>Choose options →</button></div></article>`).join('')}</div>`;
 box.querySelectorAll('[data-recommendation]').forEach(b=>b.onclick=()=>{if(checkingOut)return;showProduct(Number(b.dataset.recommendation),!!subscription);if(subscription){$('cadence').value=subscription.frequency;updateOptionPrice();}});
}

function subscriptionChoices(catalog){
 const available=catalog.filter(p=>p.active&&p.stock>0);
 const matchers=[/^(?:neuroshroom|lion[’']?s? mane(?: mushroom(?: powder)?)?)$/i,/^reishi(?: mushroom)?$/i,/^thrive mode$/i];
 return {coffees:available.filter(p=>(p.category||'coffee')==='coffee'),mushrooms:matchers.map(re=>available.find(p=>re.test(p.name.trim()))).filter(Boolean)};
}
function subscriptionItemPrice(p,recurring){return Math.round(p.price*(recurring&&(p.category||'coffee')==='coffee'?.9:1)*100)/100}
function addBuilderItem(cart,p,{quantity,grind,recurring,frequency}){
 if(!p?.active||!Number.isInteger(quantity)||quantity<1||quantity>50)throw Error('Choose a valid quantity.');
 const combined=cart.filter(i=>i.product.id===p.id).reduce((n,i)=>n+i.quantity,0);
 if(combined+quantity>p.stock||combined+quantity>50)throw Error('Only '+Math.min(p.stock,50)+' available for '+p.name+'.');
 if(recurring&&!['biweekly','monthly'].includes(frequency))throw Error('Choose a delivery frequency.');
 const cadence=recurring?frequency:null,id=[p.id,grind,recurring,cadence].join(':');
 const existing=cart.find(i=>i.id===id);
 if(existing)existing.quantity+=quantity;
 else cart.push({id,product:p,quantity,grind,grindLabel:(p.category||'coffee')==='coffee'?grindLabels[grind]:p.weight||'As packaged',isSubscription:recurring,frequency:cadence,frequencyLabel:recurring?(cadence==='biweekly'?'Every 2 weeks':'Every 4 weeks'):null});
}
function showSubscriptionBuilder(){
 const {coffees,mushrooms}=subscriptionChoices(products),existing=bag.find(i=>i.isSubscription);
 $('builder-cadence').value=existing?.frequency||'monthly';$('builder-cadence').disabled=!!existing;
 const title=p=>/neuroshroom/i.test(p.name)?'Lion’s Mane · Neuroshroom':p.name.trim();
 function cards(items){return items.map(p=>`<article><img src="${imageURL(p)}" alt=""><div><h3>${escapeHTML(title(p))}</h3><p>${escapeHTML(p.tastingNotes||p.roast||'')}</p><p>${money(p.price)}${(p.category||'coffee')==='coffee'?' · '+money(subscriptionItemPrice(p,true))+' with subscription':''} · ${escapeHTML(p.weight||'16 oz')}</p><div class="builder-item-controls">${(p.category||'coffee')==='coffee'?`<label>Grind<select data-builder-grind="${p.id}" aria-label="Grind for ${escapeHTML(title(p))}">${Object.entries(grindLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label>`:''}<label>Quantity<input type="number" min="1" max="${Math.min(50,p.stock)}" value="1" data-builder-quantity="${p.id}" aria-label="Quantity for ${escapeHTML(title(p))}"></label></div><div class="builder-item-actions"><button type="button" data-builder-add="${p.id}" data-recurring="false">Add to cart</button><button type="button" data-builder-add="${p.id}" data-recurring="true">Add to subscription</button></div><p data-builder-added="${p.id}" class="fineprint"></p></div></article>`).join('')}
 $('subscription-coffees').innerHTML=cards(coffees)||'<p>No coffees available right now.</p>';
 $('subscription-mushroom-list').innerHTML=cards(mushrooms)||'<p>No mushrooms available right now.</p>';
 $('subscription-coffee-step').hidden=false;$('subscription-mushrooms').hidden=true;$('builder-back').hidden=true;$('builder-next').textContent='Next →';$('builder-status').textContent='';
 let step=1;
 $('builder-next').onclick=()=>{if(step===1){step=2;$('subscription-coffee-step').hidden=true;$('subscription-mushrooms').hidden=false;$('builder-back').hidden=false;$('builder-next').textContent='Next · view cart →';$('subscription-mushrooms').querySelector('h2').focus()}else{closeDialog($('subscription-dialog'));renderBag();openDialog('cart-dialog')}};
 $('builder-back').onclick=()=>{step=1;$('subscription-coffee-step').hidden=false;$('subscription-mushrooms').hidden=true;$('builder-back').hidden=true;$('builder-next').textContent='Next →'};
 $('subscription-dialog').querySelectorAll('[data-builder-add]').forEach(button=>button.onclick=()=>{
  const p=products.find(p=>p.id===Number(button.dataset.builderAdd)),recurring=button.dataset.recurring==='true';
  try{
   const quantity=Number($('subscription-dialog').querySelector(`[data-builder-quantity="${p.id}"]`).value),grind=$('subscription-dialog').querySelector(`[data-builder-grind="${p.id}"]`)?.value||'as-packaged';
   const frequency=bag.find(i=>i.isSubscription)?.frequency||$('builder-cadence').value;
   addBuilderItem(bag,p,{quantity,grind,recurring,frequency});persist();renderBag();
   if(recurring){$('builder-cadence').value=frequency;$('builder-cadence').disabled=true}
   $('subscription-dialog').querySelector(`[data-builder-added="${p.id}"]`).textContent=bag.filter(i=>i.product.id===p.id).reduce((n,i)=>n+i.quantity,0)+' in your cart';
   $('builder-status').textContent=quantity+' × '+title(p)+' added '+(recurring?'to your subscription.':'to your cart.')+' Keep choosing or select Next.';
   window.BeanBrosAnalytics?.track('add_to_cart',[{product:p,quantity,isSubscription:recurring}]);
  }catch(error){$('builder-status').textContent=error.message}
 });
 openDialog('subscription-dialog');
}

// Automatically quote and review after the customer finishes editing; never charge here.
let checkoutTimer,autoCheckoutKey='',autoEditVersion=0;
function scheduleCheckout(){clearTimeout(checkoutTimer);checkoutTimer=setTimeout(refreshCheckout,900)}
function autoCheckoutFingerprint(){return JSON.stringify([quoteKey(),$('shipping-form').elements.namedItem('shippingService')?.value,$('payment-email').value.trim(),$('promo-code').value.trim(),$('billing-same').checked,checkoutEmailConsent()])}
async function refreshCheckout(){
 if(!$('delivery-dialog').open||$('manual-checkout').hidden)return;
 if(checkingOut||shippingBusy){scheduleCheckout();return}
 if(!$('shipping-form').checkValidity()||!$('payment-email').checkValidity()){ $('checkout-auto-status').textContent='Enter your delivery details and email to see your total.';return }
 const key=autoCheckoutFingerprint(),editVersion=autoEditVersion;if(key===autoCheckoutKey)return;
 $('checkout-retry').hidden=true;$('checkout-auto-status').textContent='Updating shipping and total…';
 preparingPayment=true;
 try{
  if(!shippingQuote||shippingQuote.key!==quoteKey())await $('shipping-form').onsubmit({preventDefault(){}});
  if(!$('delivery-dialog').open)return;
  if(editVersion!==autoEditVersion){scheduleCheckout();return}
  if(shippingQuote&&!$('checkout-live').disabled)await $('checkout-live').onclick();
  if(editVersion!==autoEditVersion){scheduleCheckout();return}
  autoCheckoutKey=autoCheckoutFingerprint();
  $('checkout-auto-status').textContent=paymentReady?'':'Your total could not be updated. Check the details above or retry.';
  $('checkout-retry').hidden=paymentReady;
 }finally{preparingPayment=false;renderBag()}
}
for(const id of ['shipping-form','payment-email','promo-code','billing-same'])$(id).addEventListener('input',()=>{autoEditVersion++;autoCheckoutKey='';scheduleCheckout()});
$('promo-code').addEventListener('input',()=>{resetPayment();renderBag()});
$('checkout-retry').onclick=()=>{autoCheckoutKey='';refreshCheckout()};
window.addEventListener('bean-bros-billing-change',()=>{autoEditVersion++;autoCheckoutKey='';resetPayment();renderBag();scheduleCheckout()});

$('manual-checkout-toggle').onclick=()=>{if(checkingOut)return;showManualCheckout();scheduleCheckout();$('payment-email').focus()};

function checkoutEmailConsent(){return {subscriptionNews:$('email-subscription-news').checked===true,promotions:$('email-promotions').checked===true}}
for(const id of ['email-subscription-news','email-promotions'])$(id).addEventListener('change',()=>{autoEditVersion++;autoCheckoutKey='';resetPayment();renderBag();scheduleCheckout()});

$('delivery-dialog').addEventListener('cancel',e=>{if(checkingOut&&!preparingPayment)e.preventDefault()});

function showManualCheckout(){ $('manual-checkout').hidden=false; $('pay-order').after($('checkout-email-options')); }
function showAddressSuggestions(candidates){
 const box=$('address-suggestions');box.replaceChildren();
 for(const address of candidates||[]){
  const button=document.createElement('button');button.type='button';button.className='continue-shopping';
  button.textContent='Use '+[address.address,address.address2,address.city,address.state,address.zip].filter(Boolean).join(', ');
  button.onclick=()=>{if(checkingOut)return;for(const key of ['address','address2','city','state','zip'])$('shipping-form').elements.namedItem(key).value=address[key]||'';window.BeanBrosPayment.setAddress({...deliveryAddress(),...address});clearShipping();autoEditVersion++;autoCheckoutKey='';renderBag();scheduleCheckout()};box.append(button);
 }
}

function syncDeliveryAutocomplete(value,complete){
 const a=value?.address||{},values={name:value?.name||'',address:a.line1||'',address2:a.line2||'',city:a.city||'',state:a.state||'',zip:a.postal_code||''};
 const form=$('shipping-form');const changed=Object.entries(values).some(([k,v])=>form.elements.namedItem(k).value!==v);
 if(!changed)return;
 for(const [k,v] of Object.entries(values))form.elements.namedItem(k).value=v;
 clearShipping();autoEditVersion++;autoCheckoutKey='';renderBag();if(complete)scheduleCheckout();
}

function renderCartMushrooms(){
 const box=$('cart-mushrooms'),hasCoffee=bag.some(i=>(i.product.category||'coffee')==='coffee');
 const choices=hasCoffee?subscriptionChoices(products).mushrooms.filter(p=>!bag.some(i=>i.product.id===p.id)):[];
 box.hidden=!choices.length;
 if(!choices.length){box.replaceChildren();if(!hasCoffee)$('cart-mushroom-status').textContent='';return}
 const subscription=bag.find(i=>i.isSubscription);
 box.innerHTML=`<h3 id="cart-mushroom-title">Curious about mushroom coffee?</h3><p>Try a mushroom powder alongside your coffee. Choose one or mix and match.</p><div class="cart-suggestions">${choices.map(p=>`<article><img src="${imageURL(p)}" alt=""><div><h4>${escapeHTML(/neuroshroom/i.test(p.name)?'Lion’s Mane · Neuroshroom':p.name.trim())}</h4><span>${money(subscriptionItemPrice(p,!!subscription))}${subscription?' per delivery':''} · ${escapeHTML(p.weight||'')}</span><button type="button" data-cart-mushroom="${p.id}" ${checkingOut?'disabled':''}>${subscription?'Add to subscription':'Add to cart'}</button></div></article>`).join('')}</div>`;
 box.querySelectorAll('[data-cart-mushroom]').forEach(button=>button.onclick=()=>{
  if(checkingOut)return;
  const p=products.find(p=>p.id===Number(button.dataset.cartMushroom));
  try{addBuilderItem(bag,p,{quantity:1,grind:'as-packaged',recurring:!!subscription,frequency:subscription?.frequency});persist();renderBag();$('cart-mushroom-status').textContent=p.name+' added. You can adjust the quantity in your cart.';window.BeanBrosAnalytics?.track('add_to_cart',[{product:p,quantity:1,isSubscription:!!subscription}]);}
  catch(error){$('cart-mushroom-status').textContent=error.message}
 });
}

$('wallet-retry').onclick=()=>{closeDialog($('delivery-dialog'));setTimeout(()=>$('begin-checkout').onclick(),0)};
