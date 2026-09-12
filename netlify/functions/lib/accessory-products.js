const db=require('./db');
const ids={'travel-mug':910001,'speckled-mug':910002,ceramic:910003,glass:910004,dripper:910005};
async function list(){
 // Owner authorized the travel mug launch: $25, 20 units, 12 oz. Never reset existing inventory.
 await db.query(`INSERT INTO products(id,name,price,stock,weight,active,category,sort_order) VALUES(910001,'Bean Bros Travel Mug',25,20,'12 oz',true,'accessories',1000) ON CONFLICT(id) DO NOTHING`);
 return db.query('SELECT id,price,stock,weight,active FROM products WHERE id=ANY($1::int[])',[Object.values(ids)]);
}
async function save(p,expectedStock){
 const rows=await db.query(`INSERT INTO products(id,name,price,stock,weight,active,category,sort_order,bio,tasting_notes,image_key) VALUES($1,$2,$3,$4,$5,$6,'accessories',1000,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,weight=EXCLUDED.weight,active=EXCLUDED.active,bio=EXCLUDED.bio,tasting_notes=EXCLUDED.tasting_notes,image_key=EXCLUDED.image_key,stock=CASE WHEN $4=$10 THEN products.stock ELSE $4 END,updated_at=now() WHERE $4=$10 OR products.stock=$10 RETURNING id`,[ids[p.id],p.name,p.price||0,p.stock,p.weight,p.active&&!p.comingSoon,p.description,p.subtitle,p.imageKey,expectedStock]);
 if(!rows.length)throw Error('Stock changed while you were editing. Reload accessories before changing quantity.');
}
module.exports={ids,list,save};
