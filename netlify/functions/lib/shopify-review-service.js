const crypto = require('node:crypto');
const links = require('./order-review-links');
// Dependency injection allows tests without a live database or email sends.
function createService({db,secret,now=Date.now}) {
  let ready;
  function schema() {return ready ||= db.query(`CREATE TABLE IF NOT EXISTS shopify_review_invitations(id text PRIMARY KEY,order_id text NOT NULL UNIQUE,snapshot jsonb NOT NULL,due_at timestamptz NOT NULL,revoked boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS shopify_product_reviews(id text PRIMARY KEY,invitation_id text NOT NULL REFERENCES shopify_review_invitations(id),product_id text NOT NULL,rating int NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created_at timestamptz NOT NULL DEFAULT now(),moderated_at timestamptz,UNIQUE(invitation_id,product_id));`).catch(e=>{ready=null;throw e;});}
  // Internal only. Caller must obtain the snapshot from authenticated Shopify data,
  // not a browser form, and provide a confirmed delivery timestamp.
  async function issue(snapshot) {
    const order = links.normalizeOrder(snapshot,now());
    const id = crypto.randomUUID();
    await schema();
    const row = await db.one(`INSERT INTO shopify_review_invitations(id,order_id,snapshot,due_at) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(order_id) DO UPDATE SET order_id=EXCLUDED.order_id RETURNING id`,[id,order.id,JSON.stringify(order),new Date(Date.parse(order.deliveredAt)+3*links.DAY).toISOString()]);
    return row.id;
  }
  async function invitation(token) {
    const id = links.verify(token,secret,now());
    if (!id) return null;
    await schema();
    return db.one('SELECT id,snapshot FROM shopify_review_invitations WHERE id=$1 AND revoked=false',[id]);
  }
  async function view(token) {
    const row=await invitation(token);if(!row)return null;
    const submitted=await db.query('SELECT product_id FROM shopify_product_reviews WHERE invitation_id=$1',[row.id]);
    return {orderName:row.snapshot.name,items:[...new Map(row.snapshot.items.map(i=>[i.productId,i])).values()].map(i=>({productId:i.productId,name:i.name,image:i.image,reviewed:submitted.some(s=>s.product_id===i.productId)}))};
  }
  async function submit({token,productId,rating,body}) {
    if (!Number.isInteger(rating)||rating<1||rating>5||typeof body!=='string'||body.trim().length<1||body.length>3000)return {status:400,error:'Choose 1–5 stars and write a comment of 1–3,000 characters.'};
    const row=await invitation(token);
    if(!row || !row.snapshot.items.some(i=>i.productId===String(productId)))return {status:403,error:'This review link is invalid, expired, or does not include that product.'};
    const saved=await db.one(`INSERT INTO shopify_product_reviews(id,invitation_id,product_id,rating,body) VALUES($1,$2,$3,$4,$5) ON CONFLICT(invitation_id,product_id) DO NOTHING RETURNING id`,[crypto.randomUUID(),row.id,String(productId),rating,body.trim()]);
    return saved ? {status:200,ok:true,message:'Thank you! Your review is private and awaiting approval.'} : {status:409,error:'You have already reviewed this product from this order.'};
  }
  return {schema,issue,view,submit};
}
module.exports={createService};
