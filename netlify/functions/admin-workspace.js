const crypto=require('crypto');
const db=require('./lib/db');
const {getOrders}=require('./lib/orders');
const {getProducts}=require('./lib/products');
const {verifyAdminToken}=require('./lib/auth');
const {corsHeaders}=require('./lib/cors');
let ready;
function ensureSchema(){if(!ready)ready=db.query(`CREATE TABLE IF NOT EXISTS admin_workspace_records (
 id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('note','task')), customer_email text NOT NULL DEFAULT '',
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
)`).catch(e=>{ready=null;throw e});return ready}
exports.handler=async event=>{
 const headers=corsHeaders(event,{'Content-Type':'application/json','Cache-Control':'private, no-store'}),reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(event.httpMethod==='OPTIONS')return reply(200,{});
 if(!verifyAdminToken(event.headers?.authorization||event.headers?.Authorization,process.env.ADMIN_TOKEN_SECRET))return reply(401,{error:'Please sign in to the business workspace.'});
 if(!['GET','POST','PATCH'].includes(event.httpMethod))return reply(405,{error:'Method not allowed'});
 try{
  await ensureSchema();
  if(event.httpMethod==='GET'){
   const [orders,products,records]=await Promise.all([getOrders(),getProducts(),db.query('SELECT id,kind,customer_email,body,created_at,updated_at FROM admin_workspace_records ORDER BY created_at DESC LIMIT 5000')]);
   return reply(200,{orders,products,records,updatedAt:new Date().toISOString()});
  }
  let input;try{input=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Invalid JSON'})}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{error:'Invalid request.'});
  if(event.httpMethod==='PATCH'){
   if(input.action==='product'){const result=await require('./lib/admin-product').editProduct(input);return reply(result.status,result);}
   if(input.action==='stock'){
    if(!Number.isSafeInteger(input.productId)||!Number.isInteger(input.stock)||input.stock<0||input.stock>2147483647||!Number.isInteger(input.expectedStock))return reply(400,{error:'Enter a valid stock count.'});
    const rows=await db.query('UPDATE products SET stock=$2,updated_at=now() WHERE id=$1 AND stock=$3 RETURNING id,stock',[input.productId,input.stock,input.expectedStock]);
    if(!rows.length)return reply(409,{error:'Stock changed since you opened this product. Refresh and try again.'});
    return reply(200,{ok:true,product:rows[0]});
   }
   if(typeof input.id!=='string'||input.id.length>100||typeof input.done!=='boolean')return reply(400,{error:'Invalid task update.'});
   const rows=await db.query(`UPDATE admin_workspace_records SET body=jsonb_set(body,'{done}',$2::jsonb),updated_at=now() WHERE id=$1 AND kind='task' RETURNING id`,[input.id,JSON.stringify(input.done)]);
   return rows.length?reply(200,{ok:true}):reply(404,{error:'Task not found.'});
  }
  if(!['note','task'].includes(input.kind)||typeof input.text!=='string'||!input.text.trim()||input.text.length>4000)return reply(400,{error:'Enter a note or task of up to 4,000 characters.'});
  const email=String(input.customerEmail||'').trim().toLowerCase();
  if(email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return reply(400,{error:'Enter a valid customer email.'});
  const due=String(input.due||'');
  if(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due))return reply(400,{error:'Enter a valid due date.'});
  const record={text:input.text.trim(),done:false,due,owner:String(input.owner||'Store owner').slice(0,100)};
  const id=crypto.randomUUID();
  await db.query('INSERT INTO admin_workspace_records(id,kind,customer_email,body) VALUES($1,$2,$3,$4::jsonb)',[id,input.kind,email,JSON.stringify(record)]);
  return reply(201,{ok:true,id});
 }catch(err){console.error('Workspace request failed:',err.name);return reply(503,{error:'The workspace could not complete this request. Please refresh before retrying.'})}
};
