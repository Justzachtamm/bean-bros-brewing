const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
const {getProducts}=require('./lib/products');
const {stripeProducts,report,syncProduct}=require('./lib/stripe-catalog');
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'no-store'}),reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Not authenticated'});
 if(!['GET','POST'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 try{
  if(!/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||''))return reply(503,{error:'Live Stripe is not configured.'});
  const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY),catalog=await getProducts();
  let ids;
  if(event.httpMethod==='POST'){try{ids=JSON.parse(event.body||'{}').ids}catch{return reply(400,{error:'Invalid request'})}if(!Array.isArray(ids)||!ids.length||ids.length>3||!ids.every(id=>Number.isSafeInteger(id)&&catalog.some(p=>p.id===id)))return reply(400,{error:'Choose up to three catalog items.'});}
  const list=await stripeProducts(stripe);
  if(event.httpMethod==='GET')return reply(200,{products:report(catalog,list)});
  const synced=[];for(const id of new Set(ids))synced.push(await syncProduct(stripe,catalog.find(p=>p.id===id),list));
  return reply(200,{synced});
 }catch(error){console.error('Stripe catalog:',error.message);return reply(500,{error:'Stripe catalog could not be updated. Retry the check; completed items will be preserved.'});}
};
