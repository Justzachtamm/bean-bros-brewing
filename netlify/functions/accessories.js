const {getStore,connectLambda}=require('@netlify/blobs');
const defaults=require('./lib/accessory-defaults.json');
const inventory=require('./lib/accessory-products');
const bannerDefaults=require('./lib/banner-defaults.json');
const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'no-store'}),reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!['GET','PUT'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 if(event.httpMethod==='PUT'&&!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Not authenticated'});
 try{
  connectLambda(event);const store=getStore('accessory-previews');let changed=null,changedBanner=null;let liveProducts=await inventory.list();
  if(event.httpMethod==='PUT'){
   let p;try{p=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid request'})}
   if(p.kind==='banner'){
    if(typeof p.visible!=='boolean'||typeof p.showItemLabels!=='boolean'||!['badge','title','highlight','description','note','buttonText','itemLabel'].every(k=>typeof p[k]==='string'&&p[k].length<=2000)||!p.title.trim()||!p.buttonText.trim())return reply(400,{error:'Check the banner title, button text and visibility.'});
    changedBanner=Object.fromEntries(Object.keys(bannerDefaults).map(k=>[k,p[k]]));await store.setJSON('coming-soon-banner',changedBanner);
   }else{
   if(!defaults.some(x=>x.id===p.id))return reply(400,{error:'Choose an accessory.'});
   const prior=await store.get(p.id,{type:'json'})||{},live=liveProducts.find(x=>Number(x.id)===inventory.ids[p.id]);
   p.comingSoon=p.comingSoon??prior.comingSoon??(p.id!=='travel-mug');p.stock=p.stock??live?.stock??0;p.weight=p.weight??live?.weight??'';p.launchLabel=p.launchLabel??prior.launchLabel??'Coming soon';p.showLaunchBadge=p.showLaunchBadge??prior.showLaunchBadge??true;
   if(typeof p.comingSoon!=='boolean'||typeof p.showLaunchBadge!=='boolean'||typeof p.launchLabel!=='string'||p.launchLabel.length>100||!Number.isInteger(p.stock)||p.stock<0||p.stock>100000||typeof p.weight!=='string'||p.weight.length>50)return reply(400,{error:'Check availability, stock, weight and badge text.'});
   if(!p.comingSoon){if(!Number.isFinite(p.price)||p.price<=0)return reply(400,{error:'Set a price before making this item available.'});try{require('./lib/shipping-rates').netWeightLbs(p.weight)}catch{return reply(400,{error:'Enter shipping weight, for example 12 oz, before making this item available.'})}}
   if(!defaults.some(x=>x.id===p.id)||!['name','subtitle','description'].every(k=>typeof p[k]==='string'&&p[k].length<=4000)||!p.name.trim()||typeof p.active!=='boolean'||!(p.price===null||Number.isFinite(p.price)&&p.price>=0&&p.price<=99999)||!(p.imageKey===null||typeof p.imageKey==='string'&&/^[A-Za-z0-9_./-]{1,200}$/.test(p.imageKey)))return reply(400,{error:'Check the accessory name, price and photo.'});
   changed={id:p.id,name:p.name.trim(),subtitle:p.subtitle,description:p.description,active:p.active,price:p.price,imageKey:p.imageKey,comingSoon:p.comingSoon,launchLabel:p.launchLabel,showLaunchBadge:p.showLaunchBadge,stock:p.stock,weight:p.weight};await inventory.save(changed,p.expectedStock??live?.stock??0);await store.setJSON(p.id,changed);liveProducts=await inventory.list();
   }
  }
  const items=await Promise.all(defaults.map(async p=>{const saved=changed?.id===p.id?changed:await store.get(p.id,{type:'json'});const live=liveProducts.find(x=>Number(x.id)===inventory.ids[p.id]);const item={...p,...saved,comingSoon:saved?.comingSoon??(p.id!=='travel-mug'),stock:live?.stock??0,weight:live?.weight??'',productId:inventory.ids[p.id]};if(live&&Number(live.price)>0)item.price=Number(live.price);item.purchasable=!!live?.active&&!item.comingSoon&&item.stock>0;if(item.imageKey){item.productRender=true;item.images=['/.netlify/functions/image?key='+encodeURIComponent(item.imageKey)];}return item}));
  const banner={...bannerDefaults,...(changedBanner||await store.get('coming-soon-banner',{type:'json'}))};
  return reply(200,{items,banner});
 }catch(e){return reply(500,{error:'Accessories could not be loaded or saved. Please retry.'})}
};
