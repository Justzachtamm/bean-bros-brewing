exports.handler=async event=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  const reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
  if(process.env.SHOPIFY_REVIEWS_ENABLED!=='true')return reply(503,{error:'Order reviews are not enabled yet.'});
  if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
  if(Buffer.byteLength(event.body||'')>10000)return reply(413,{error:'Request too large'});
  let b;try{b=JSON.parse(event.body||'{}');}catch{return reply(400,{error:'Invalid request'});}
  try{
    const {consumeLimit,clientIp}=require('./lib/rate-limit');
    if(!await consumeLimit('shopify-review:'+clientIp(event),60,3600))return reply(429,{error:'Please try again later.'});
    const service=require('./lib/shopify-review-service').createService({db:require('./lib/db'),secret:process.env.SHOPIFY_REVIEW_LINK_SECRET});
    if(b.action==='view'){const result=await service.view(b.token);return result?reply(200,result):reply(403,{error:'Your review link is invalid or expired. Please contact Bean Bros for a new link.'});}
    if(b.action!=='submit')return reply(400,{error:'Unknown action'});
    const result=await service.submit(b);const {status,...data}=result;return reply(status,data);
  }catch(e){console.error('Shopify review service',e.name);return reply(500,{error:'Reviews are temporarily unavailable. Please try again later.'});}
};
