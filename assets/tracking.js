'use strict';
// Basic consent mode: no platform script or event is loaded before opt-in.
(() => {
 const config=window.BeanBrosTrackingConfig||{},key='bb_cookie_consent_v1';
 let consent={analytics:false,marketing:false},saved=false;
 try {const v=JSON.parse(localStorage.getItem(key));if(v&&Date.now()-v.at<180*86400000){consent={analytics:v.analytics===true,marketing:v.marketing===true};saved=true}}catch{}
 if(navigator.globalPrivacyControl){consent.marketing=false}
 const enabled=!!(config.google||config.meta||config.tiktok),started={};
 const script=src=>{const s=document.createElement('script');s.async=true;s.src=src;document.head.append(s)};
 function start(){
  if(consent.analytics&&config.google&&!started.google){
   started.google=true;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};
   gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());
   gtag('config',config.google,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
   gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title,page_referrer:document.referrer?new URL(document.referrer).origin:''});
   script('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.google));
  }
  if(consent.marketing&&config.meta&&!started.meta){
   started.meta=true;const fb=window.fbq=function(){fb.callMethod?fb.callMethod.apply(fb,arguments):fb.queue.push(arguments)};
   window._fbq=fb;fb.push=fb;fb.loaded=true;fb.version='2.0';fb.queue=[];
   fb('set','autoConfig',false,config.meta);fb('init',config.meta);fb('consent','grant');fb('track','PageView');
   script('https://connect.facebook.net/en_US/fbevents.js');
  }
  if(consent.marketing&&config.tiktok&&!started.tiktok){
   started.tiktok=true;window.TiktokAnalyticsObject='ttq';const ttq=window.ttq=[];
   ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
   ttq.setAndDefer=(o,m)=>{o[m]=function(){o.push([m].concat(Array.prototype.slice.call(arguments)))}};
   ttq.methods.forEach(m=>ttq.setAndDefer(ttq,m));
   ttq.instance=id=>{const o=ttq._i[id]||[];ttq.methods.forEach(m=>ttq.setAndDefer(o,m));return o};
   ttq._i={};ttq._i[config.tiktok]=[];ttq._i[config.tiktok]._u='https://analytics.tiktok.com/i18n/pixel/events.js';
   ttq._t={};ttq._t[config.tiktok]=+new Date();ttq._o={};ttq._o[config.tiktok]={};
   ttq.grantConsent();ttq.page();script('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='+encodeURIComponent(config.tiktok)+'&lib=ttq');
  }
 }
 // Only product IDs, names, quantities and prices; no account or shipping fields.
 function track(name,lines){
  if(!['view_item','add_to_cart','begin_checkout'].includes(name)||!Array.isArray(lines))return;
  const items=lines.map(i=>({item_id:String(i.product.id),item_name:String(i.product.name).trim(),price:Math.round(i.product.price*(i.isSubscription&&(i.product.category||'coffee')==='coffee'?.9:1)*100)/100,quantity:i.quantity||1}));
  const value=Math.round(items.reduce((n,i)=>n+i.price*i.quantity,0)*100)/100;
  if(consent.analytics&&started.google)window.gtag('event',name,{currency:'USD',value,items});
  const events={view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout'};
  if(consent.marketing&&started.meta)window.fbq('track',events[name],{currency:'USD',value,content_type:'product',content_ids:items.map(i=>i.item_id),contents:items.map(i=>({id:i.item_id,quantity:i.quantity,item_price:i.price}))});
  if(consent.marketing&&started.tiktok)window.ttq.track(events[name],{currency:'USD',value,contents:items.map(i=>({content_id:i.item_id,content_name:i.item_name,content_type:'product',price:i.price,quantity:i.quantity}))});
 }
 function checkoutContext(){
  const c={analytics:consent.analytics,marketing:consent.marketing};
  const cookie=name=>{const entry=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return entry?entry.slice(name.length+1):''};
  if(c.analytics){c.clientId=cookie('_ga').split('.').slice(2).join('.');const session=cookie('_ga_'+String(config.google||'').replace('G-',''));c.sessionId=session.startsWith('GS2.')?(session.match(/(?:^|[.$])s(\d+)/)||[])[1]:session.split('.')[2]}
  if(c.marketing){c.fbp=cookie('_fbp');c.fbc=cookie('_fbc');c.ttp=cookie('_ttp')}
  return c;
 }
 window.BeanBrosAnalytics={checkoutContext,track:(...args)=>{try{track(...args)}catch{/* Tracking must never interrupt shopping. */}}};
 const dialog=document.createElement('section');dialog.className='cookie-dialog';dialog.hidden=true;dialog.setAttribute('role','region');dialog.setAttribute('aria-labelledby','cookie-title');
 dialog.innerHTML='<h2 id="cookie-title">Your cookie choices</h2><p>Essential storage keeps your bag and account working. Optional cookies help us understand visits and measure advertising.</p><label><input type="checkbox" id="cookie-analytics"> Analytics (Google Analytics)</label><label><input type="checkbox" id="cookie-marketing"> Advertising (Meta and TikTok)</label><p><a href="/privacy.html#cookies">Read our privacy policy</a></p><div class="cookie-actions"><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="save">Save choices</button><button type="button" data-choice="all">Accept all</button></div>';
 document.body.append(dialog);
 const analytics=dialog.querySelector('#cookie-analytics'),marketing=dialog.querySelector('#cookie-marketing');
 analytics.disabled=!config.google;marketing.disabled=!(config.meta||config.tiktok)||!!navigator.globalPrivacyControl;
 function open(){analytics.checked=consent.analytics;marketing.checked=consent.marketing;dialog.hidden=false}
 const button=document.createElement('button');button.type='button';button.className='cookie-settings';button.textContent='Cookie settings';button.onclick=open;(document.querySelector('footer')||document.body).append(button);
 dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
  const previous={...consent};consent={analytics:!!config.google&&(b.dataset.choice==='all'||b.dataset.choice==='save'&&analytics.checked),marketing:!!(config.meta||config.tiktok)&&!navigator.globalPrivacyControl&&(b.dataset.choice==='all'||b.dataset.choice==='save'&&marketing.checked)};
  try{localStorage.setItem(key,JSON.stringify({...consent,at:Date.now()}))}catch{}
  if(previous.analytics&&!consent.analytics&&window.gtag)window.gtag('consent','update',{analytics_storage:'denied'});
  if(previous.marketing&&!consent.marketing){window.fbq?.('consent','revoke');window.ttq?.revokeConsent()}
  dialog.hidden=true;
  // Remove loaded SDKs after withdrawal; never reload if choices cannot persist.
  if(previous.analytics&&!consent.analytics||previous.marketing&&!consent.marketing){
   for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(/^(_ga|_gid|_gat|_fbp|_fbc|_ttp|ttcsid)/.test(name)){for(const domain of ['',location.hostname,'.'+location.hostname])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'')}}
   try{if(JSON.parse(localStorage.getItem(key)).at)location.reload()}catch{}
  }else start();
 });
 start();if(enabled&&!saved)open();
})();
