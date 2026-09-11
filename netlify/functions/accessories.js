const {getStore,connectLambda}=require('@netlify/blobs');
const defaults=require('./lib/accessory-defaults.json');
const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'no-store'}),reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!['GET','PUT'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 if(event.httpMethod==='PUT'&&!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Not authenticated'});
 try{
  connectLambda(event);const store=getStore({name:'accessory-previews',consistency:'strong'});
  if(event.httpMethod==='PUT'){
   let p;try{p=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request'})}
   if(!defaults.some(x=>x.id===p.id)||!['name','subtitle','description'].every(k=>typeof p[k]==='string'&&p[k].length<=4000)||!p.name.trim()||typeof p.active!=='boolean'||!(p.price===null||Number.isFinite(p.price)&&p.price>=0&&p.price<=99999)||!(p.imageKey===null||typeof p.imageKey==='string'&&/^[A-Za-z0-9_./-]{1,200}$/.test(p.imageKey)))return reply(400,{error:'Check the accessory name, price and photo.'});
   await store.setJSON(p.id,{name:p.name.trim(),subtitle:p.subtitle,description:p.description,active:p.active,price:p.price,imageKey:p.imageKey});
  }
  const items=await Promise.all(defaults.map(async p=>{const saved=await store.get(p.id,{type:'json'});const item={...p,...saved};if(item.imageKey){item.productRender=true;item.images=['/.netlify/functions/image?key='+encodeURIComponent(item.imageKey)];}return item}));
  return reply(200,{items});
 }catch(e){return reply(500,{error:'Accessories could not be loaded or saved. Please retry.'})}
};
