const db=require('./db'),mail=require('./email'),crypto=require('crypto');
let ready;
async function schema(){if(!ready)ready=db.query(`CREATE TABLE IF NOT EXISTS customer_messages(id text PRIMARY KEY,recipient text NOT NULL,payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending',attempts int NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,error text);
CREATE TABLE IF NOT EXISTS product_reviews(id text PRIMARY KEY,order_id text NOT NULL,product_id bigint NOT NULL,email text NOT NULL,display_name text NOT NULL,rating int NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL,survey jsonb NOT NULL DEFAULT '{}',status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),reason text,created_at timestamptz NOT NULL DEFAULT now(),moderated_at timestamptz,UNIQUE(order_id,product_id,email));
CREATE TABLE IF NOT EXISTS customer_care_state(id text PRIMARY KEY,body jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO customer_care_state(id,body) VALUES('activation',jsonb_build_object('at',now())) ON CONFLICT DO NOTHING;`).catch(e=>{ready=null;throw e});return ready}
function message(subject,body,link='https://beanbrosbrewingco.com/account.html',label='Open your account'){return {subject,html:mail.shell(`<h1 style="font-family:Georgia,serif;font-weight:400">${mail.esc(subject)}</h1><p>${mail.esc(body).replace(/\n/g,'<br>')}</p><p><a href="${mail.esc(link)}" style="background:#203b2b;color:#fff;padding:14px 22px;display:inline-block">${mail.esc(label)}</a></p>`),text:body+'\n\n'+label+': '+link,tag:'customer-service'}}
async function queue(id,to,payload){await schema();return db.query(`INSERT INTO customer_messages(id,recipient,payload) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING`,[id,to,JSON.stringify(payload)])}
async function flush(limit=15,id=null){await schema();if(!mail.isConfigured())return {sent:0,error:'Email provider is not configured'};
 // A stale send has an unknown delivery outcome. Never resend it automatically.
 await db.query(`UPDATE customer_messages SET status='review',error='Delivery outcome unknown; check provider logs before retrying' WHERE status='sending' AND sent_at < now()-interval '10 minutes'`);
 let sent=0;for(let i=0;i<limit;i++){let row=await db.one(`UPDATE customer_messages SET status='sending',sent_at=now(),attempts=attempts+1 WHERE id=(SELECT id FROM customer_messages WHERE status='pending' AND ($1::text IS NULL OR id=$1) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) AND status='pending' RETURNING *`,[id]);if(!row)break;
 const result=await mail.send({to:row.recipient,...row.payload});const status=result.ok?'sent':result.error?'review':'failed';await db.query(`UPDATE customer_messages SET status=$2,error=$3 WHERE id=$1`,[row.id,status,result.ok?null:String(result.error||result.body||result.skipped||result.status).slice(0,400)]);if(result.ok)sent++;}
 return {sent};}
async function sendQueued(id){try{return await flush(1,id)}catch(e){console.error('Queued email delivery deferred',e.name);return {sent:0,error:'Delivery deferred'}}}
async function trackingReady(order){
 if(!liveOrder(order)||!order.customerEmail||!order.trackingNumber)return;
 const id='tracking:'+order.id+':'+order.trackingNumber;
 await queue(id,order.customerEmail,message('Your Bean Bros tracking number is ready',`Order ${order.id}\nUPS tracking number: ${order.trackingNumber}\nYour label has been created. Tracking updates will appear when UPS receives and scans your package.`,'https://www.ups.com/track?tracknum='+encodeURIComponent(order.trackingNumber),'Track your package'));
 await sendQueued(id);
}
function liveOrder(o){return o.accounting?.livemode===true}
function delivered(o){return o.status==='Delivered'||!!o.deliveredAt||!!o.receivedAt}
function purchasedItem(o,productId){return (o.items||[]).find(i=>!i.isShipping&&String(i.productId)===String(productId))}
module.exports={schema,queue,flush,sendQueued,message,trackingReady,liveOrder,delivered,purchasedItem};
