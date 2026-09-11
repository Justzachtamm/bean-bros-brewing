const Stripe = require('stripe');
const crypto = require('crypto');
const {verifyAdminToken} = require('./lib/auth');
const {corsHeaders} = require('./lib/cors');
exports.handler = async event => {
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'no-store'});
 const reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Not authenticated'});
 if(!['GET','POST','PATCH'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 try {
  const stripe=Stripe(process.env.STRIPE_SECRET_KEY);
  if(event.httpMethod==='GET'){
   const cursor=event.queryStringParameters?.after;
   const page=await stripe.promotionCodes.list({limit:50,...(cursor?{starting_after:cursor}:{})});
   return reply(200,{codes:page.data.map(p=>({id:p.id,code:p.code,active:p.active,percent:p.coupon.percent_off,amount:p.coupon.amount_off,currency:p.coupon.currency,expires:p.expires_at,limit:p.max_redemptions,used:p.times_redeemed})),next:page.has_more?page.data.at(-1).id:null});
  }
  let body;try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request'})}
  if(event.httpMethod==='PATCH'){
   if(typeof body.id!=='string'||!/^promo_[A-Za-z0-9]+$/.test(body.id))return reply(400,{error:'Invalid promotion code'});
   await stripe.promotionCodes.update(body.id,{active:false});return reply(200,{ok:true});
  }
  const code=typeof body.code==='string'?body.code.trim().toUpperCase():'';
  const value=Number(body.value),limit=body.limit===''||body.limit==null?undefined:Number(body.limit);
  const expires=body.expires?Math.floor(Date.parse(body.expires)/1000):undefined;
  if(!/^[A-Z0-9]{3,30}$/.test(code))return reply(400,{error:'Use 3–30 letters or numbers for the code.'});
  if(!['percent','amount'].includes(body.type)||!Number.isFinite(value)||value<=0||(body.type==='percent'&&value>100)||Math.abs(value*100-Math.round(value*100))>0.000001||value>100000)return reply(400,{error:'Enter a valid discount, with at most two decimal places. Percent discounts cannot exceed 100%.'});
  if(limit!==undefined&&(!Number.isSafeInteger(limit)||limit<1))return reply(400,{error:'Redemption limit must be a positive whole number.'});
  if(expires!==undefined&&(!Number.isFinite(expires)||expires<=Date.now()/1000))return reply(400,{error:'Choose a future expiration date.'});
  // The same submitted form can safely retry after an uncertain network response.
  if(typeof body.requestId!=='string'||! /^[a-f0-9-]{36}$/i.test(body.requestId))return reply(400,{error:'Refresh the form and try again.'});
  const key='bb-promo-'+crypto.createHash('sha256').update(body.requestId).digest('hex');
  const coupon=await stripe.coupons.create({name:code,duration:'once',...(body.type==='percent'?{percent_off:value}:{amount_off:Math.round(value*100),currency:'usd'})},{idempotencyKey:key+'-coupon'});
  const promo=await stripe.promotionCodes.create({coupon:coupon.id,code,...(limit?{max_redemptions:limit}:{}),...(expires?{expires_at:expires}:{})},{idempotencyKey:key+'-code'});
  return reply(200,{id:promo.id,code:promo.code});
 }catch(err){console.error('Promotion management:',err.message);return reply(err.type==='StripeInvalidRequestError'?400:500,{error:err.type==='StripeInvalidRequestError'?err.message:'Could not update promotion codes. Please retry.'})}
};
