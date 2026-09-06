const Stripe=require('stripe');
const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
const {getOrders}=require('./lib/orders');
const {getProducts}=require('./lib/products');
const store=require('./lib/business-records');
const {report,quarter,TAX_CODES}=require('./lib/accounting');
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'private, no-store'}),reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Please sign in.'});
 try{
 if(event.httpMethod==='GET'){
 const period=event.queryStringParameters?.period||quarter(new Date()),mode=event.queryStringParameters?.mode||'live';
 if(!/^20\d{2}-Q[1-4]$/.test(period)||!['live','test'].includes(mode))return reply(400,{error:'Invalid reporting period.'});
 const [orders,expenses,filings,refunds,profiles,products]=await Promise.all([getOrders(),store.list('expense'),store.list('filing'),store.list('refund'),store.list('tax_profile'),getProducts()]);
 let stripeStatus;try{const stripe=Stripe(process.env.STRIPE_SECRET_KEY);const settings=await stripe.tax.settings.retrieve();const registrations=[];for await(const r of stripe.tax.registrations.list({limit:100})){registrations.push({id:r.id,country:r.country,state:r.country_options?.us?.state,status:r.status,activeFrom:r.active_from,expiresAt:r.expires_at,livemode:r.livemode})}stripeStatus={status:settings.status,livemode:settings.livemode,registrations}}catch{stripeStatus={status:'unavailable',error:'Stripe Tax settings could not be verified.'}}
 return reply(200,{...report(orders,period,mode),expenses:expenses.filter(r=>quarter(r.body.date)===period),filings:filings.filter(r=>r.body.period===period),refunds:refunds.filter(r=>quarter(r.body.date)===period&&r.body.livemode===(mode==='live')&&r.body.currency==='usd'),profiles,products,taxCodes:TAX_CODES,stripe:stripeStatus,taxEnabled:process.env.STRIPE_TAX_ENABLED==='true'});
 }
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 let x;try{x=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid JSON'})}
 if(!x||typeof x!=='object'||Array.isArray(x))return reply(400,{error:'Invalid record.'});
 if(x.kind==='tax_profile'){
 if(!Number.isSafeInteger(x.productId)||!Object.hasOwn(TAX_CODES,x.category))return reply(400,{error:'Choose a supported tax category.'});
 if(!(await getProducts()).some(p=>p.id===x.productId))return reply(404,{error:'Product not found.'});
 await store.save('tax_profile',String(x.productId),{category:x.category});return reply(200,{ok:true});
 }
 if(!['expense','filing'].includes(x.kind)||!/^[-\w]{8,100}$/.test(x.id||''))return reply(400,{error:'Invalid record.'});
 if(!Number.isSafeInteger(x.amount)||x.amount<0||x.amount>100000000||!validDate(x.date))return reply(400,{error:'Enter a valid date and amount.'});
 const note=String(x.note||'').trim();if(!note||note.length>2000)return reply(400,{error:'Provide a description or filing confirmation (up to 2,000 characters).'});
 let body={amount:x.amount,date:x.date,note};
 if(x.kind==='expense'){if(!['inventory','shipping','fees','marketing','operations','other'].includes(x.category))return reply(400,{error:'Choose an expense category.'});body.category=x.category}
 else {if(!/^20\d{2}-Q[1-4]$/.test(x.period||'')||! /^[A-Z]{2}$/.test(x.state||'')||!validDate(x.dueDate)||!['planned','filed','paid'].includes(x.status))return reply(400,{error:'Enter the state, quarter, verified due date, and filing status.'});body={...body,period:x.period,state:x.state,dueDate:x.dueDate,status:x.status}}
 // Append-only records: the client reuses its ID on retries, preventing duplicates.
 await store.append(x.kind,x.id,body);return reply(201,{ok:true,id:x.id});
 }catch(e){console.error('Accounting request failed:',e.name);return reply(503,{error:'Accounting could not complete this request. Refresh and retry.'})}
};
