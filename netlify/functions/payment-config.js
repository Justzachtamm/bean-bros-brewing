const {corsHeaders}=require('./lib/cors');
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'no-store'});
 const response=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(event.httpMethod==='OPTIONS')return response(200,{});
 if(event.httpMethod!=='GET')return response(405,{error:'Method not allowed'});
 const key=process.env.STRIPE_PUBLISHABLE_KEY||'',secret=process.env.STRIPE_SECRET_KEY||'';
 if(!/^pk_(test|live)_[A-Za-z0-9]+$/.test(key)||key.split('_')[1]!==secret.split('_')[1])return response(503,{error:'Secure payment is not configured yet. Please contact the store.'});
 return response(200,{publishableKey:key});
};
