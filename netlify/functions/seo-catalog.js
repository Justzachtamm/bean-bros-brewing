const {getProducts}=require('./lib/products');
const seo=require('./lib/seo-catalog');
exports.handler=async event=>{
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(event.httpMethod))return {statusCode:405,headers:{...headers,Allow:'GET, HEAD'},body:''};
 try{
  const list=seo.active(await getProducts()),q={...(event.queryStringParameters||{})};
  const pathname=event.rawUrl?new URL(event.rawUrl).pathname:event.path||'';
  if(/^\/shop\/?$/.test(pathname))q.kind='shop';
  if(pathname==='/sitemap.xml')q.kind='sitemap';
  if(pathname==='/feeds/products.xml')q.kind='feed';
  if(pathname.startsWith('/products/'))q.product=pathname.slice('/products/'.length);
  if(q.kind==='feed'||q.kind==='sitemap')return {statusCode:200,headers:{...headers,'Content-Type':'application/xml; charset=utf-8'},body:event.httpMethod==='HEAD'?'':seo[q.kind](list)};
  if(q.kind==='shop')return {statusCode:200,headers,body:event.httpMethod==='HEAD'?'':seo.shopPage(list)};
  const parts=(q.product||'').split('/').filter(Boolean),p=list.find(p=>String(p.id)===parts[0]);
  if(!p)return {statusCode:404,headers:{...headers,'X-Robots-Tag':'noindex'},body:'<!doctype html><html lang="en"><title>Product not found</title><h1>Product not found</h1><a href="/shop/">Browse the current collection</a></html>'};
  if(parts.length!==2||parts[1]!==seo.slug(p))return {statusCode:301,headers:{...headers,Location:seo.url(p)},body:''};
  return {statusCode:200,headers,body:event.httpMethod==='HEAD'?'':seo.productPage(p)};
 }catch{return {statusCode:503,headers:{...headers,'Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex'},body:'The collection is temporarily unavailable. Please try again shortly.'}}
};
