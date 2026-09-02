const { getDatabase } = require("@netlify/database");

// One connection object per warm lambda.
let cached = null;
function connection() {
  if (!cached) cached = getDatabase();
  return cached;
}

// IMPORTANT: use `pool`, not `httpClient`.
//
// getDatabase() returns one of two shapes. It only returns the 'serverless'
// variant — the one carrying `httpClient` — when NETLIFY_DB_DRIVER is set to
// "serverless"; otherwise it returns the 'server' variant, which has NO
// httpClient at all. Reaching for httpClient unconditionally is what took
// signup and login down in production: it was undefined, so every query threw
// before it ever reached Postgres.
//
// `pool` is present on BOTH shapes (pg.Pool for 'server', Neon's pg-compatible
// Pool for 'serverless'), so this one code path works either way.
//
// Returns an array of row objects. ALWAYS pass values via `params` ($1, $2, …);
// never interpolate them into `text`.
async function query(text, params = []) {
  const result = await connection().pool.query(text, params);
  return result.rows;
}

async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

function isConfigured() {
  return !!process.env.NETLIFY_DB_URL;
}

// Non-sensitive shape report, for diagnosing a connection without exposing the
// URL. Never returns the connection string.
function describe() {
  try {
    const conn = connection();
    return { ok: true, driver: conn.driver, hasPool: !!conn.pool, hasHttpClient: !!conn.httpClient };
  } catch (err) {
    return { ok: false, error: err.name || "unknown" };
  }
}

module.exports = { query, one, isConfigured, describe, connection };
