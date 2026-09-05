const crypto = require("crypto");
const db = require("./db");

// Count before work, in one statement: parallel attempts cannot share a slot.
async function consumeLimit(key, limit, seconds) {
  const digest = crypto.createHash("sha256").update(key).digest("hex");
  const row = await db.one(`INSERT INTO request_limits (key, count, window_at)
    VALUES ($1, 1, now()) ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN request_limits.window_at > now() - ($2 * interval '1 second')
      THEN request_limits.count + 1 ELSE 1 END,
    window_at = CASE WHEN request_limits.window_at > now() - ($2 * interval '1 second')
      THEN request_limits.window_at ELSE now() END RETURNING count`, [digest, seconds]);
  return row.count <= limit;
}

function clientIp(event) {
  // Set by Netlify; never trust a caller's arbitrary X-Forwarded-For chain.
  return event.headers?.["x-nf-client-connection-ip"] || "unknown";
}

module.exports = { consumeLimit, clientIp };
