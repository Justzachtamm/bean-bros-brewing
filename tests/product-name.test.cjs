const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite'),{loader}=require('./helpers.cjs');
test('checkout matches saved product names with surrounding spaces and decrements the same stock',async()=>{
 const db=new PGlite();try{
 await db.exec('CREATE TABLE products (id bigint, name text, origin text, region text, altitude text, tasting_notes text, bio text, roast text, price numeric, weight text, stock integer, active boolean, badge text, badge_color text, image_key text, category text, sort_order integer, updated_at timestamptz)');
 await db.query('INSERT INTO products (id,name,price,stock,active) VALUES ($1,$2,$3,$4,$5)',[5,'Fara Estate Nicaragua ',25.99,7,true]);
 const products=loader({'./db':{one:async(sql,args)=>(await db.query(sql,args)).rows[0],query:async(sql,args)=>(await db.query(sql,args)).rows}})('netlify/functions/lib/products.js');
 assert.equal((await products.getProductByName(' FARA ESTATE NICARAGUA ')).id,5);
 await products.decrementStock([{name:'Fara Estate Nicaragua',quantity:2}]);
 assert.equal((await products.getProductByName('Fara Estate Nicaragua')).stock,5);
 assert.equal(await products.getProductByName('Unknown coffee'),null);
 }finally{await db.close()}
});
