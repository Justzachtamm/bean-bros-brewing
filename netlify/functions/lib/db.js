const { getDatabase } = require("@netlify/database");

// One connection object per warm lambda. Netlify supplies NETLIFY_DB_URL; the
// HTTP client is the right driver for short-lived functions — one round trip
// per query, no pool or WebSocket to establish and tear down.
let cached = null;
function connection() {
  if (!cached) cached = getDatabase();
  return cached;
}

// Returns an array of row objects. ALWAYS pass values via `params` ($1, $2, …);
// never interpolate them into `text`.
async function query(text, params = []) {
  return connection().httpClient.query(text, params);
}

async function one(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

function isConfigured() {
  return !!process.env.NETLIFY_DB_URL;
}

module.exports = { query, one, isConfigured, connection };
