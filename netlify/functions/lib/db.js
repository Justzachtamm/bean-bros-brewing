const { getDatabase } = require("@netlify/database");

// @netlify/database's getConnectionString() reads ONE key: NETLIFY_DB_URL.
// Netlify's own docs and some extension versions provision the variable as
// NETLIFY_DATABASE_URL instead, and when the names disagree getDatabase()
// throws MissingDatabaseConnectionError even though the database is wired up
// correctly — which is exactly what took signup and login down in production
// while build-time migrations kept working.
//
// So resolve the string ourselves from any of the names it may arrive under
// and pass it explicitly, rather than depending on the library's single guess.
const CONNECTION_ENV_KEYS = [
  "NETLIFY_DB_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DATABASE_URL_UNPOOLED",
  "DATABASE_URL",
];

function connectionStringFromEnv() {
  for (const key of CONNECTION_ENV_KEYS) {
    const value = process.env[key];
    if (value) return { key, value };
  }
  return null;
}

// One connection object per warm lambda.
let cached = null;
function connection() {
  if (!cached) {
    const found = connectionStringFromEnv();
    // Pass it explicitly when we found it; fall back to the library's own
    // lookup so this keeps working if Netlify starts injecting it by another
    // route entirely.
    cached = found ? getDatabase({ connectionString: found.value }) : getDatabase();
  }
  return cached;
}

// IMPORTANT: use `pool`, not `httpClient`.
//
// getDatabase() returns the 'serverless' shape — the one carrying httpClient —
// only when NETLIFY_DB_DRIVER === "serverless". Otherwise it returns the
// 'server' shape, which has NO httpClient. `pool` is present on both (pg.Pool
// and Neon's pg-compatible Pool), so this one code path works either way.
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
  return !!connectionStringFromEnv();
}

// Non-sensitive diagnostics: reports WHICH env key supplied the connection and
// which driver shape came back, but never the connection string itself.
function describe() {
  const found = connectionStringFromEnv();
  const base = {
    connectionEnvKey: found ? found.key : null,
    envKeysPresent: CONNECTION_ENV_KEYS.filter((k) => !!process.env[k]),
  };
  try {
    const conn = connection();
    return { ...base, ok: true, driver: conn.driver, hasPool: !!conn.pool, hasHttpClient: !!conn.httpClient };
  } catch (err) {
    return { ...base, ok: false, error: err.name || "unknown" };
  }
}

module.exports = { query, one, isConfigured, describe, connection, CONNECTION_ENV_KEYS };
