const test=require('node:test'),assert=require('node:assert/strict');const {loader}=require('./helpers.cjs');const seo=require('../netlify/functions/lib/seo-catalog');const product={id:7,name:'Coffee & cocoa </script>',active:true,price:18.99,stock:3,category:'coffee',bio:'A fresh cup.',weight:'16 oz'};
test('product pages have escaped copy, canonical URLs and live offer data',()=>{const html=seo.productPage(product);assert.ok(!html.includes('Coffee & cocoa </script>'));const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(schema.offers.price,'18.99');assert.equal(schema.offers.availability,'https://schema.org/InStock');assert.ok(html.includes('/?product=7#coffee'));assert.match(seo.productPage({...product,stock:0}),/OutOfStock/)});
test('catalog and sitemap include active products only; feeds escape XML',()=>{const list=seo.active([product,{...product,id:9,active:false}]);assert.equal(list.length,1);assert.match(seo.feed(list),/Coffee &amp; cocoa &lt;\/script&gt;/);assert.match(seo.sitemap(list),/\/products\/7\//);assert.ok(!seo.sitemap(list).includes('/products/9/'))});
test('missing products return 404, renamed products redirect and DB outages return 503',async()=>{const handler=loader({'./lib/products':{getProducts:async()=>[product]}})('netlify/functions/seo-catalog.js').handler;assert.equal((await handler({httpMethod:'GET',queryStringParameters:{product:'999/missing/'}})).statusCode,404);assert.equal((await handler({httpMethod:'GET',queryStringParameters:{product:'7/old-name/'}})).statusCode,301);const failed=loader({'./lib/products':{getProducts:async()=>{throw Error('db')}}})('netlify/functions/seo-catalog.js').handler;assert.equal((await failed({httpMethod:'GET',queryStringParameters:{kind:'sitemap'}})).statusCode,503)});
test('Netlify rewritten requests route by original public URL',async()=>{const handler=loader({'./lib/products':{getProducts:async()=>[product]}})('netlify/functions/seo-catalog.js').handler;for(const [path,pattern]of [['/shop/',/<h1>Find your daily favorite/],['/sitemap.xml',/<urlset/],['/feeds/products.xml',/<rss/],['/products/7/'+seo.slug(product)+'/',/application\/ld\+json/]]){const r=await handler({httpMethod:'GET',rawUrl:'https://beanbrosbrewingco.com'+path});assert.equal(r.statusCode,200);assert.match(r.body,pattern)}});
test('newer catalog products have real images, complete social metadata and breadcrumbs',()=>{
 for(const [id,name] of [[900036,'Lucky Star'],[910001,'Bean Bros Travel Mug']]){
  const p={...product,id,name};const html=seo.productPage(p);
  assert.match(seo.image(p),/-web\.webp$/);assert.match(seo.feed([p]),new RegExp('<g:id>'+id+'</g:id>'));
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.equal(schemas[1]['@type'],'BreadcrumbList');assert.equal(schemas[1].itemListElement.at(-1).item,seo.url(p));
  for(const key of ['twitter:title','twitter:description','twitter:image','og:image:alt'])assert.ok(html.includes(key));
 }
 assert.equal(seo.image({...product,imageKey:'product-new.png'}),seo.ORIGIN+'/.netlify/functions/image?key=product-new.png');
 assert.equal(seo.image({...product,id:123456}),null);
 assert.match(seo.sitemap([product]),/\/collections\//);
});
test('noncanonical product path redirects once to the preserved canonical slug',async()=>{
 const handler=loader({'./lib/products':{getProducts:async()=>[product]}})('netlify/functions/seo-catalog.js').handler;
 for(const suffix of ['', '/extra/', '//']){
  const r=await handler({httpMethod:'GET',rawUrl:seo.url(product).replace(/\/$/,'')+suffix});
  assert.equal(r.statusCode,301);assert.equal(r.headers.Location,seo.url(product));
 }
 const r=await handler({httpMethod:'HEAD',rawUrl:seo.url(product)});assert.equal(r.statusCode,200);assert.equal(r.body,'');
});

test('shop slash normalization redirects only the exact slashless path',async()=>{
 const handler=loader({'./lib/products':{getProducts:async()=>[product]}})('netlify/functions/seo-catalog.js').handler;
 const plain=await handler({httpMethod:'GET',rawUrl:seo.ORIGIN+'/shop'});
 assert.equal(plain.statusCode,301);assert.equal(plain.headers.Location,seo.ORIGIN+'/shop/');
 const canonical=await handler({httpMethod:'GET',rawUrl:seo.ORIGIN+'/shop/'});
 assert.equal(canonical.statusCode,200);assert.equal(canonical.headers.Location,undefined);
 assert.match(canonical.body,/<h1>Find your daily favorite/);
 const redirects=require('node:fs').readFileSync('_redirects','utf8');
 assert.ok(!/^\/shop\s+\/shop\//m.test(redirects));
});
