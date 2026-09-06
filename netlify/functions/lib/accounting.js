// All monetary values in these records are integer cents from Stripe.
const TAX_CODES = Object.freeze({coffee:'txcd_41050006',tea:'txcd_41050008',accessories:'txcd_99999999',prepared_food:'txcd_40060003'});
function taxCode(category){if(!Object.hasOwn(TAX_CODES,category))throw Error('This product needs a tax category before it can be purchased.');return TAX_CODES[category]}
const id = value => typeof value==='string'?value:value?.id||null;
function snapshot(source, event, lines, invoice=false){
 const tax=invoice?source.tax:source.total_details?.amount_tax;
 return {version:1,livemode:typeof source.livemode==='boolean'?source.livemode:typeof event.livemode==='boolean'?event.livemode:null,
 currency:source.currency||null,paidAt:new Date(((invoice?source.status_transitions?.paid_at:null)||event.created||Math.floor(Date.now()/1000))*1000).toISOString(),
 sourceId:source.id,paymentIntent:id(source.payment_intent),charge:id(source.charge),invoice:invoice?source.id:null,
 subtotal:source.amount_subtotal??source.subtotal??null,total:source.amount_total??source.total??null,paid:source.amount_paid??source.amount_total??null,
 discount:source.total_details?.amount_discount??(source.total_discount_amounts?source.total_discount_amounts.reduce((n,t)=>n+t.amount,0):null),
 shipping:source.shipping_cost?.amount_subtotal??(invoice?lines.filter(l=>l.price?.product?.metadata?.kind==='shipping').reduce((n,l)=>n+(l.amount||0),0):null),
 tax:Number.isSafeInteger(tax)?tax:null,automaticTax:source.automatic_tax?.status||'unknown',
 lines:lines.map(l=>{const p=l.price?.product,m=p?.metadata||{};return {id:l.id,name:p?.name||l.description||'Item',productId:m.product_id||null,category:m.category||m.kind||'unclassified',taxCode:id(p?.tax_code)||m.tax_code||null,quantity:l.quantity,
 subtotal:l.amount_subtotal??l.amount??null,tax:l.amount_tax??(Array.isArray(l.tax_amounts)?l.tax_amounts.reduce((n,t)=>n+t.amount,0):null),total:l.amount_total??null,
 taxes:(l.taxes||l.tax_amounts||[]).map(t=>({amount:t.amount,taxableAmount:t.taxable_amount??null,reason:t.taxability_reason||null,rateId:id(t.rate||t.tax_rate),state:(t.rate||t.tax_rate)?.state||null,country:(t.rate||t.tax_rate)?.country||null,percentage:(t.rate||t.tax_rate)?.percentage??null}))}})};
}
function quarter(date){if(!date||!Number.isFinite(new Date(date).getTime()))return 'unknown';const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric'}).formatToParts(new Date(date));return parts.find(p=>p.type==='year').value+'-Q'+Math.ceil(Number(parts.find(p=>p.type==='month').value)/3)}
function report(orders,period,mode){
 const selected=[],states=Object.create(null),categories=Object.create(null);let missing=0,excluded=0;
 for(const o of orders){const a=o.accounting;if(quarter(a?.paidAt||o.date)!==period)continue;if(!a||typeof a.livemode!=='boolean'){missing++;continue}if(a.livemode!==(mode==='live')){excluded++;continue}if(a.currency!=='usd'||!Number.isSafeInteger(a.tax)||a.automaticTax!=='complete'){missing++;continue}
 selected.push(o);const state=o.shippingAddress?.state||'Unknown';const s=states[state]||={state,orders:0,sales:0,tax:0};s.orders++;s.sales+=a.subtotal||0;s.tax+=a.tax;
 for(const l of a.lines||[]){const c=categories[l.category]||={category:l.category,sales:0,tax:0,missingTaxLines:0};c.sales+=l.subtotal||0;if(Number.isSafeInteger(l.tax))c.tax+=l.tax;else c.missingTaxLines++}
 }
 return {period,mode,orders:selected.map(o=>({id:o.id,date:o.accounting.paidAt,email:o.customerEmail,state:o.shippingAddress?.state||'',...o.accounting})),states:Object.values(states),categories:Object.values(categories),missing,excluded,totals:{orders:selected.length,sales:selected.reduce((n,o)=>n+(o.accounting.subtotal||0),0),tax:selected.reduce((n,o)=>n+o.accounting.tax,0)}};
}
module.exports={TAX_CODES,taxCode,snapshot,quarter,report};
