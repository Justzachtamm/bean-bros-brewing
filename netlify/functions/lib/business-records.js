const db=require('./db');
let ready;
async function ensureSchema(){if(!ready)ready=db.query(`CREATE TABLE IF NOT EXISTS business_records (
 kind text NOT NULL CHECK(kind IN ('contact','expense','filing','refund','tax_profile')),id text NOT NULL,body jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(kind,id))`).catch(e=>{ready=null;throw e});return ready}
async function list(kind){await ensureSchema();return db.query('SELECT kind,id,body,created_at,updated_at FROM business_records WHERE kind=$1 ORDER BY updated_at DESC',[kind])}
async function save(kind,id,body){await ensureSchema();return db.query(`INSERT INTO business_records(kind,id,body) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,id) DO UPDATE SET body=EXCLUDED.body,updated_at=now() RETURNING *`,[kind,id,JSON.stringify(body)])}
async function append(kind,id,body){await ensureSchema();return db.query(`INSERT INTO business_records(kind,id,body) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,id) DO NOTHING RETURNING *`,[kind,id,JSON.stringify(body)])}
module.exports={list,save,append,ensureSchema};
