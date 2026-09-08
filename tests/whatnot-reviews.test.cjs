const test=require('node:test'),assert=require('node:assert/strict');
const {loader}=require('./helpers.cjs');
const imported=require('../netlify/functions/lib/whatnot-reviews');
const seo=require('../netlify/functions/lib/seo-catalog');
test('Whatnot excerpts attach only to named products and preserve external provenance',()=>{
 const coffee=imported.forProduct(6);assert.equal(coffee.length,1);assert.equal(coffee[0].id,imported.forProduct(8)[0].id);
 assert.equal(imported.forProduct(7).length,0);assert.equal(imported.forProduct(900006).length,0);
 assert.match(imported.forProduct(900016)[0].context,/chamomile/);assert.match(imported.forProduct(900029)[0].context,/butterfly pea/);
 for(const id of [6,8,900016,900029]){
  const r=imported.forProduct(id)[0];assert.equal(r.source,'Whatnot');assert.equal(r.sourceUrl,'https://www.whatnot.com/user/beanbros/reviews');assert.equal(r.order_id,undefined);assert.equal(r.rating,undefined);
  const html=seo.productPage({id,name:'Test product',price:20,stock:1});assert.match(html,/Whatnot review excerpts/);assert.ok(!html.includes('Verified purchase'));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(schema.aggregateRating,undefined);assert.equal(schema.review,undefined);
 }
});
test('review API keeps external excerpts separate from approved website purchases',async()=>{
 const local={id:'local-1',rating:4,body:'Website purchase review'};
 const h=loader({'./lib/customer-care':{schema:async()=>{}},'./lib/db':{query:async()=>[local]}})('netlify/functions/reviews.js').handler;
 const res=await h({httpMethod:'GET',headers:{},queryStringParameters:{productId:'6'}});
 assert.equal(res.statusCode,200);const data=JSON.parse(res.body);assert.equal(data.reviews[0].id,'local-1');assert.equal(data.whatnotReviews[0].source,'Whatnot');assert.equal(data.whatnotReviews.length,1);
});
