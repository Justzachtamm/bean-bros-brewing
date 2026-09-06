const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
const store=require('./lib/business-records');
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'private, no-store'}),reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Please sign in.'});
 try{
 if(event.httpMethod==='GET')return reply(200,{contacts:await store.list('contact')});
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 let x;try{x=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid JSON'})}
 if(!x||typeof x!=='object'||Array.isArray(x))return reply(400,{error:'Invalid contact.'});
 const email=String(x.email||'').trim().toLowerCase();if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply(400,{error:'Enter a valid email.'});
 const body={email};for(const key of ['name','company','phone','owner','tags']){if(typeof x[key]!=='string'||x[key].length>200)return reply(400,{error:'Contact fields must be 200 characters or fewer.'});body[key]=x[key].trim()}
 if(!body.name||!['lead','customer','wholesale','inactive'].includes(x.stage))return reply(400,{error:'Enter a name and contact stage.'});
 body.stage=x.stage;body.lastContact=String(x.lastContact||'');
 if(body.lastContact&&(!/^\d{4}-\d{2}-\d{2}$/.test(body.lastContact)||!Number.isFinite(Date.parse(body.lastContact))||new Date(body.lastContact).toISOString().slice(0,10)!==body.lastContact))return reply(400,{error:'Enter a valid last-contact date.'});
 await store.save('contact',email,body);return reply(200,{ok:true});
 }catch(e){console.error('CRM request failed:',e.name);return reply(503,{error:'The contact could not be saved. Refresh and retry.'})}
};
