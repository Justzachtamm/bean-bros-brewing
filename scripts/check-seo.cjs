// Validate the built public site; optionally include a freshly downloaded public product catalog.
// Usage: node scripts/check-seo.cjs /path/to/public-products.json
const fs=require('node:fs'),path=require('node:path');
const seo=require('../netlify/functions/lib/seo-catalog');
const root=path.resolve(__dirname,'..','dist'),pages=new Map(),errors=[],external=new Set(),links=new Set();
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&')]));
for(const [url,file] of [['/','index.html'],['/collections/','collections/index.html'],...['privacy','terms','shipping-returns','accessibility'].map(s=>['/'+s+'.html',s+'.html'])])pages.set(url,fs.readFileSync(path.join(root,file),'utf8'));
let products=[];
if(process.argv[2]){products=seo.active(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));pages.set('/shop/',seo.shopPage(products));for(const p of products)pages.set(new URL(seo.url(p)).pathname,seo.productPage(p))}
const titles=new Set(),descriptions=new Set();
function fail(url,message){errors.push(url+': '+message)}
for(const [url,html] of pages){
 const tags=[...html.matchAll(/<[a-z][^>]*>/gi)].map(m=>({name:m[0].match(/^<(\w+)/)[1].toLowerCase(),a:attrs(m[0])}));
 const metas=tags.filter(t=>t.name==='meta').map(t=>t.a);
 const canonical=tags.filter(t=>t.name==='link'&&t.a.rel==='canonical');
 if(canonical.length!==1||canonical[0].a.href!==seo.ORIGIN+url)fail(url,'Incorrect canonical');
 if(metas.some(m=>m.name==='robots'&&/noindex/i.test(m.content)))fail(url,'Public page is noindex');
 for(const key of ['description','viewport','twitter:card','twitter:title','twitter:description','twitter:image'])if(!metas.some(m=>m.name===key&&m.content?.trim()))fail(url,'Missing '+key);
 for(const key of ['og:title','og:description','og:url','og:image','og:image:alt'])if(!metas.some(m=>m.property===key&&m.content?.trim()))fail(url,'Missing '+key);
 const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];const desc=metas.find(m=>m.name==='description')?.content;
 if(!title||titles.has(title))fail(url,'Missing or duplicate title');titles.add(title);
 if(!desc||descriptions.has(desc))fail(url,'Missing or duplicate description');descriptions.add(desc);
 // Closed dialogs do not form part of the page's visible heading outline.
 const visible=html.replace(/<dialog\b[\s\S]*?<\/dialog>/g,'');
 const headings=[...visible.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)];
 if(headings.filter(h=>h[1]==='1').length!==1)fail(url,'Expected one H1');
 let level=0;for(const h of headings){if(+h[1]>level+1)fail(url,'Skipped heading level H'+h[1]);if(!h[2].replace(/<[^>]*>/g,'').trim())fail(url,'Empty heading');level=+h[1]}
 for(const t of tags.filter(t=>t.name==='img')){if(!Object.hasOwn(t.a,'alt'))fail(url,'Image missing alt');if(t.a.src&&(!t.a.width||!t.a.height))fail(url,'Image missing dimensions: '+t.a.src)}
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{const data=JSON.parse(match[1]);if(data['@type']==='Product'){const p=products.find(p=>String(p.id)===data.sku);if(!p||data.name!==p.name||data.offers.price!==p.price.toFixed(2)||data.offers.availability!=='https://schema.org/'+(p.stock>0?'InStock':'OutOfStock'))fail(url,'Product schema differs from current catalog')}}catch{fail(url,'Invalid JSON-LD')}}
 for(const t of tags){const ref=t.name==='a'||t.name==='link'?t.a.href:t.a.src;if(!ref||/^(mailto:|tel:|data:)/.test(ref))continue;const u=new URL(ref,seo.ORIGIN+url);if(u.protocol!=='https:'){fail(url,'Non-HTTPS reference '+ref);continue}if(u.origin!==seo.ORIGIN){external.add(u.href);continue}links.add(u.pathname+u.search+u.hash);
  let target=pages.get(u.pathname);let file=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!target&&fs.existsSync(file)&&fs.statSync(file).isFile()&&file.endsWith('.html'))target=fs.readFileSync(file,'utf8');
  const dynamic=u.pathname==='/shop/'||u.pathname.startsWith('/.netlify/functions/image');
  if(!target&&!fs.existsSync(file)&&!dynamic)fail(url,'Missing local target '+ref);
  if(u.hash&&u.hash!=='#'&&target&&!['#tea','#merch','#accessories'].includes(u.hash)&&!target.includes('id="'+u.hash.slice(1)+'"'))fail(url,'Missing fragment '+ref);
 }
}
for(const f of ['admin.html','account.html','404.html'])if(!/name="robots" content="noindex/.test(fs.readFileSync(path.join(root,f),'utf8')))fail(f,'Missing private/error noindex');
if(!fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('Sitemap: '+seo.ORIGIN+'/sitemap.xml'))fail('robots.txt','Missing correct sitemap');
if(process.argv[2]){const sitemap=seo.sitemap(products);for(const url of pages.keys())if(!sitemap.includes(seo.ORIGIN+url+'</loc>'))fail(url,'Missing from sitemap');for(const p of ['/admin','/account','/404','/checkout'])if(sitemap.includes(seo.ORIGIN+p))fail('sitemap','Private route included')}
console.log(JSON.stringify({pages:pages.size,activeProducts:products.length,internalTargets:links.size,externalReferences:[...external],errors},null,2));
if(errors.length)process.exitCode=1;
