const {test}=require('node:test'),assert=require('node:assert/strict');
const {loader,event}=require('./helpers.cjs');
function harness({authorized=true,rows=[]}={}){
 const calls=[];
 const load=loader({'./lib/auth':{verifyAdminToken:()=>authorized},'./lib/db':{query:async(sql,args)=>{calls.push({sql,args});return rows}},'./lib/orders':{getOrders:async()=>[{id:'order'}]},'./lib/products':{getProducts:async()=>[{id:1}]}});
 return{handler:load('netlify/functions/admin-workspace.js').handler,calls};
}
test('private workspace refuses unauthenticated reads and writes before database access',async()=>{
 const h=harness({authorized:false});for(const httpMethod of ['GET','POST','PATCH'])assert.equal((await h.handler(event({}, {httpMethod}))).statusCode,401);assert.equal(h.calls.length,0);
});
test('workspace returns real data with private cache policy',async()=>{
 const h=harness(),res=await h.handler(event({}, {httpMethod:'GET'}));assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).orders[0].id,'order');assert.match(res.headers['Cache-Control'],/private/);
});
test('workspace validates note and task data without executing a mutation',async()=>{
 for(const body of [null,[],{kind:'note',text:''},{kind:'task',text:'a',due:'2026-02-30'},{kind:'task',text:'a',customerEmail:'bad'},{kind:'admin',text:'a'}]){const h=harness();assert.equal((await h.handler(event(body))).statusCode,400);assert.ok(!h.calls.some(c=>/INSERT|UPDATE/.test(c.sql)))}
});
test('workspace stores note contents as parameters and normalizes customer email',async()=>{
 const h=harness();assert.equal((await h.handler(event({kind:'note',text:"<script>test</script> ' SQL",customerEmail:'PERSON@EXAMPLE.COM'}))).statusCode,201);const insert=h.calls.find(c=>c.sql.startsWith('INSERT'));assert.equal(insert.args[2],'person@example.com');assert.equal(JSON.parse(insert.args[3]).text,"<script>test</script> ' SQL");assert.ok(!insert.sql.includes('<script>'));
});
test('stock updates are conditional and stale counts cannot overwrite inventory',async()=>{
 const h=harness();assert.equal((await h.handler(event({action:'stock',productId:7,stock:10,expectedStock:8},{httpMethod:'PATCH'}))).statusCode,409);const q=h.calls.find(c=>c.sql.startsWith('UPDATE'));assert.match(q.sql,/stock=\$3/);assert.equal(q.args.join(','),'7,10,8');
 const valid=harness({rows:[{id:7,stock:10}]});assert.equal((await valid.handler(event({action:'stock',productId:7,stock:10,expectedStock:8},{httpMethod:'PATCH'}))).statusCode,200);
});
test('tasks update only their completion flag and cannot edit notes',async()=>{
 const h=harness({rows:[{id:'task'}]});assert.equal((await h.handler(event({id:'task',done:true},{httpMethod:'PATCH'}))).statusCode,200);const q=h.calls.find(c=>c.sql.startsWith('UPDATE'));assert.match(q.sql,/kind='task'/);assert.equal(q.args[1],'true');
});
test('workspace SQL persists notes and tasks and preserves concurrent stock updates',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
 try{
 await db.exec('CREATE TABLE products(id bigint PRIMARY KEY,stock integer,updated_at timestamptz DEFAULT now()); INSERT INTO products(id,stock) VALUES(7,8)');
 const query=async(sql,args)=>(await db.query(sql,args)).rows;
 const load=loader({'./lib/auth':{verifyAdminToken:()=>true},'./lib/db':{query},'./lib/orders':{getOrders:async()=>[]},'./lib/products':{getProducts:async()=>[]}});
 const handler=load('netlify/functions/admin-workspace.js').handler;
 const created=await handler(event({kind:'task',text:'Check packaging',customerEmail:'PERSON@EXAMPLE.TEST',due:'2026-09-10'}));assert.equal(created.statusCode,201);
 const id=JSON.parse(created.body).id;assert.equal((await handler(event({id,done:true},{httpMethod:'PATCH'}))).statusCode,200);
 const records=JSON.parse((await handler(event({},{httpMethod:'GET'}))).body).records;assert.equal(records[0].body.done,true);assert.equal(records[0].customer_email,'person@example.test');
 assert.equal((await handler(event({action:'stock',productId:7,stock:10,expectedStock:8},{httpMethod:'PATCH'}))).statusCode,200);
 assert.equal((await handler(event({action:'stock',productId:7,stock:99,expectedStock:8},{httpMethod:'PATCH'}))).statusCode,409);
 assert.equal((await query('SELECT stock FROM products WHERE id=7'))[0].stock,10);
 }finally{await db.close()}
});
