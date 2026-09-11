const {getStore}=require('@netlify/blobs');
function normalize(value){return {subscriptionNews:value?.subscriptionNews===true,promotions:value?.promotions===true,version:'checkout-email-v1',at:new Date().toISOString()}}
async function recordPaidConsent(session){
 if(session.livemode!==true||!['paid','no_payment_required'].includes(session.payment_status)||!session.metadata?.email_consent)return;
 let consent;try{consent=JSON.parse(session.metadata.email_consent)}catch{return}
 if(consent.version!=='checkout-email-v1'||consent.subscriptionNews!==true&&consent.promotions!==true)return;
 const email=session.customer_details?.email?.trim().toLowerCase();if(!email)return;
 // Keyed by signed paid Checkout Session: webhook retries cannot duplicate consent.
 await getStore('checkout-email-consents').setJSON(session.id,{email,subscriptionNews:consent.subscriptionNews===true,promotions:consent.promotions===true,version:consent.version,consentedAt:consent.at,sessionId:session.id,source:'checkout'});
}
module.exports={normalize,recordPaidConsent};
