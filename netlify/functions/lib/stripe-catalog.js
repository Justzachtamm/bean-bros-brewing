const crypto=require('crypto');
const normalized=value=>String(value||'').trim().toLowerCase();
async function stripeProducts(stripe){const result=[];for await(const product of stripe.products.list({limit:100,expand:['data.default_price']})){result.push(product);if(result.length>10000)throw Error('Stripe catalog is too large for this check.');}return result;}
function matchProduct(product,list){return list.find(p=>p.metadata?.catalog_source==='bean_bros'&&p.metadata?.product_id===String(product.id))||list.find(p=>p.metadata?.product_id===String(product.id))||list.find(p=>normalized(p.name)===normalized(product.name)&&!p.metadata?.product_id);}
function report(catalog,list){return catalog.map(p=>{const stripe=matchProduct(p,list),price=stripe?.default_price;return {id:p.id,name:p.name.trim(),active:p.active,amount:Math.round(p.price*100),stripeId:stripe?.id||null,matched:!!stripe&&stripe.active===p.active&&stripe.name===p.name.trim()&&price?.active===true&&price.currency==='usd'&&price.unit_amount===Math.round(p.price*100)&&!price.recurring};});}
async function syncProduct(stripe,product,list){
 if(!Number.isSafeInteger(product.id)||!Number.isFinite(product.price)||product.price<0)throw Error('Invalid catalog item.');
 let existing=matchProduct(product,list);
 const data={name:product.name.trim(),active:product.active===true,metadata:{product_id:String(product.id),catalog_source:'bean_bros',category:product.category||'coffee',weight:product.weight||''}};
 if(!existing){const id='bb_catalog_'+product.id;try{existing=await stripe.products.create({id,...data},{idempotencyKey:id});}catch(e){if(e.code!=='resource_already_exists')throw e;existing=await stripe.products.retrieve(id);}}
 const amount=Math.round(product.price*100);let price;
 for await(const candidate of stripe.prices.list({product:existing.id,active:true,limit:100})){if(candidate.currency==='usd'&&candidate.unit_amount===amount&&!candidate.recurring&&candidate.tax_behavior==='exclusive'){price=candidate;break;}}
 if(!price){const key='bb-catalog-price-'+crypto.createHash('sha256').update(existing.id+':usd:'+amount+':exclusive').digest('hex');price=await stripe.prices.create({product:existing.id,currency:'usd',unit_amount:amount,tax_behavior:'exclusive',metadata:{catalog_source:'bean_bros',product_id:String(product.id)}},{idempotencyKey:key});}
 const updated=await stripe.products.update(existing.id,{...data,default_price:price.id});
 const index=list.findIndex(p=>p.id===existing.id);const record={...updated,default_price:price};if(index<0)list.push(record);else list[index]=record;
 return {id:product.id,name:data.name,stripeId:existing.id,priceId:price.id,amount};
}
module.exports={stripeProducts,matchProduct,report,syncProduct};
