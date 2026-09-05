const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {loader,event,root}=require('./helpers.cjs');
let pg,db,load,A;
before(async()=>{
  pg=new PGlite();
  for(const f of fs.readdirSync(path.join(root,'netlify/database/migrations')).sort()) await pg.exec(fs.readFileSync(path.join(root,'netlify/database/migrations',f),'utf8'));
  const client={query:(...args)=>pg.query(...args),release(){}};
  db={query:async(...args)=>(await pg.query(...args)).rows,one:async(...args)=>(await pg.query(...args)).rows[0]||null,connection:()=>({pool:{connect:async()=>client}})};
  load=loader({'netlify/functions/lib/db.js':db});A=load('netlify/functions/lib/accounts.js');
});
after(async()=>{await pg.close()});
test('migrated product IDs accept the timestamp IDs produced by admin',async()=>{
  const products=load('netlify/functions/lib/products.js');
  await products.saveProducts([{id:1788600000000,name:'Test coffee',stock:10,price:20}]);
  assert.equal((await products.getProducts())[0].id,1788600000000);
});
test('signup cannot grant access to historical orders before email verification; revoked sessions fail',async()=>{
  const {user}=await A.createUser({email:'owner@example.test',name:'Owner',password:'test-password'});
  const token=A.issueSession(user), request=event({}, {headers:{authorization:'Bearer '+token}});
  assert.equal((await A.requireSession(request,{})).error.statusCode,403);
  assert.equal((await A.requireSession(request,{}, {allowUnverified:true})).user.id,user.id);
  await db.query('UPDATE accounts SET email_verified_at=now(), session_version=session_version+1 WHERE id=$1',[user.id]);
  assert.equal((await A.requireSession(request,{})).error.statusCode,401);
  const verified=await A.findUser(user.email), verifiedRequest=event({}, {headers:{authorization:'Bearer '+A.issueSession(verified)}});
  assert.equal((await A.requireSession(verifiedRequest,{})).email,user.email);
  const logout=load('netlify/functions/account-logout.js');assert.equal((await logout.handler(verifiedRequest)).statusCode,200);
  assert.equal((await A.requireSession(verifiedRequest,{})).error.statusCode,401);
  assert.equal((await A.requireSession(event({}, {headers:{authorization:'Bearer garbage'}}),{})).error.statusCode,401);
  assert.equal(A.sessionFromAuthHeader('Bearer '+A.issueSession(verified,-1)),null);
});
test('email verification enforces one-use codes, attempt limit and expiry in SQL',async()=>{
  const {user}=await A.createUser({email:'verification@example.test',password:'test-password'});
  const auth={authorization:'Bearer '+A.issueSession(user)};
  let sent;
  const handler=loader({'netlify/functions/lib/db.js':db,'netlify/functions/lib/email.js':{isConfigured:()=>true,send:async payload=>{sent=payload;return{ok:true}}}})('netlify/functions/account-verify-email.js').handler;
  assert.equal((await handler(event({action:'send'},{headers:auth}))).statusCode,200);
  const code=sent.text.match(/\b\d{8}\b/)[0];
  assert.equal((await handler(event({action:'send'},{headers:auth}))).statusCode,429);
  for(let i=0;i<5;i++)assert.equal((await handler(event({action:'verify',code:'00000000'},{headers:auth}))).statusCode,400);
  assert.equal((await handler(event({action:'verify',code},{headers:auth}))).statusCode,400);
  await db.query("UPDATE accounts SET verification_attempts=0,verification_expires_at=now()-interval '1 second' WHERE id=$1",[user.id]);
  assert.equal((await handler(event({action:'verify',code},{headers:auth}))).statusCode,400);
  await db.query("UPDATE accounts SET verification_expires_at=now()+interval '1 minute' WHERE id=$1",[user.id]);
  const response=await handler(event({action:'verify',code},{headers:auth}));
  assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).user.emailVerified,true);
  assert.equal((await handler(event({action:'verify',code},{headers:auth}))).statusCode,401);
  const fresh=JSON.parse(response.body).token;
  assert.equal((await A.requireSession(event({}, {headers:{authorization:'Bearer '+fresh}}),{})).user.emailVerified,true);
});
test('password changes revoke earlier tokens',async()=>{
  const user=await A.findUser('owner@example.test'),token=A.issueSession(user);
  const updated=await A.updateUser(user.email,{newPassword:'replacement-test-password'});
  assert.equal(updated.sessionVersion,user.sessionVersion+1);
  assert.equal((await A.requireSession(event({}, {headers:{authorization:'Bearer '+token}}),{})).error.statusCode,401);
});
test('rate limiter increments atomically and resets its time window',async()=>{
  const limit=load('netlify/functions/lib/rate-limit.js');
  assert.equal(await limit.consumeLimit('test-limit',2,60),true);
  assert.equal(await limit.consumeLimit('test-limit',2,60),true);
  assert.equal(await limit.consumeLimit('test-limit',2,60),false);
  await db.query("UPDATE request_limits SET window_at=now()-interval '2 minutes'");
  assert.equal(await limit.consumeLimit('test-limit',2,60),true);
});
test('order insertion and inventory roll back together; redelivery decrements once',async()=>{
  const orders=load('netlify/functions/lib/orders.js');
  const order={id:'BB-TEST',sessionId:'cs_test_atomic',items:[{name:'Test coffee',productId:1788600000000,quantity:2},{name:'Shipping',quantity:1,isShipping:true}],total:47.99,extra:{shippingService:'02'}};
  await pg.exec("CREATE FUNCTION fail_test_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated inventory failure'; END $$; CREATE TRIGGER fail_stock BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fail_test_stock();");
  await assert.rejects(orders.recordPaidOrder(order),/simulated inventory failure/);
  assert.equal(await orders.getOrderBySource(order.sessionId),null);
  await pg.exec('DROP TRIGGER fail_stock ON products; DROP FUNCTION fail_test_stock();');
  assert.equal((await orders.recordPaidOrder(order)).created,true);
  assert.equal((await orders.recordPaidOrder(order)).created,false);
  assert.equal((await db.one('SELECT stock FROM products WHERE id=$1',[1788600000000])).stock,8);
  assert.equal((await orders.getOrderBySource(order.sessionId)).shippingService,'02');
});
test('a label claim is exclusive and cannot automatically expire into a duplicate purchase',async()=>{
  const orders=load('netlify/functions/lib/orders.js');
  assert.ok(await orders.claimLabel('BB-TEST'));
  assert.equal(await orders.claimLabel('BB-TEST'),null);
});
test('redirects reject lookalike hosts, credentials and external origins',()=>{
  const redirects=load('netlify/functions/lib/redirects.js');
  assert.equal(redirects.isAllowedRedirect('https://beanbrosbrewingco.com/#/cart'),true);
  for(const value of ['https://beanbrosbrewingco.com.evil.test/','https://beanbrosbrewingco.com@evil.test/','javascript:alert(1)','http://localhost:8888/'])assert.equal(redirects.isAllowedRedirect(value),false);
  assert.equal(redirects.checkoutSuccessUrl('https://beanbrosbrewingco.com/#/checkout-success'),'https://beanbrosbrewingco.com/?session_id={CHECKOUT_SESSION_ID}#/checkout-success');
});
test('public image endpoint refuses label keys without reading blob storage',async()=>{
  const response=await load('netlify/functions/image.js').handler(event({}, {httpMethod:'GET',queryStringParameters:{key:'label-BB-TEST.png'}}));
  assert.equal(response.statusCode,400);
  assert.equal((await load('netlify/functions/shipping-label.js').handler(event({}, {httpMethod:'GET'}))).statusCode,401);
});
test('receipt requires proof and confirmed payment, and uses the charged total',async()=>{
  const token='a'.repeat(64), session={id:'cs_test_receipt',status:'complete',payment_status:'paid',mode:'payment',currency:'usd',amount_total:2799,metadata:{receipt_token_hash:crypto.createHash('sha256').update(token).digest('hex')}};
  const handler=loader({stripe:()=>({checkout:{sessions:{retrieve:async()=>session}}}),'./lib/orders':{getOrderBySource:async()=>({id:'BB-REAL',items:[],total:27.99,customerEmail:'private@example.test'})}})('netlify/functions/checkout-status.js').handler;
  assert.equal((await handler(event({sessionId:session.id,receiptToken:'b'.repeat(64)}))).statusCode,403);
  let response=JSON.parse((await handler(event({sessionId:session.id,receiptToken:token}))).body);
  assert.equal(response.paid,true);assert.equal(response.total,27.99);assert.equal(response.order.customerEmail,undefined);
  session.payment_status='unpaid';response=JSON.parse((await handler(event({sessionId:session.id,receiptToken:token}))).body);
  assert.equal(response.paid,false);assert.equal(response.order,undefined);
});
test('admin password attempts are limited before authentication',async()=>{
  const handler=load('netlify/functions/admin-login.js').handler;
  for(let i=0;i<10;i++)assert.equal((await handler(event({password:'wrong'},{headers:{'x-nf-client-connection-ip':'192.0.2.10'}}))).statusCode,401);
  assert.equal((await handler(event({password:'test-password-only'},{headers:{'x-nf-client-connection-ip':'192.0.2.10'}}))).statusCode,429);
});
test('authenticated label downloads are private and support legacy labels',async()=>{
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000})).toString('base64');
  const signature=crypto.createHmac('sha256','test-admin-only').update(payload).digest('base64');
  let accessed;
  const handler=loader({'./lib/orders':{getOrderById:async()=>({labelKey:'label-existing.png'})},'@netlify/blobs':{connectLambda(){},getStore:name=>{accessed=name;return{get:async()=>Buffer.from('private-label')}}}})('netlify/functions/shipping-label.js').handler;
  const response=await handler(event({}, {httpMethod:'GET',headers:{authorization:'Bearer '+payload+'.'+signature},queryStringParameters:{orderId:'BB-OLD'}}));
  assert.equal(response.statusCode,200);assert.equal(accessed,'images');assert.equal(response.headers['Cache-Control'],'private, no-store');assert.equal(Buffer.from(response.body,'base64').toString(),'private-label');
});
