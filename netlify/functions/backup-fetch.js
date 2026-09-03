const crypto = require("crypto");
const { connectLambda, getStore } = require("@netlify/blobs");

// Machine access to the weekly snapshots, for the scheduled job that copies
// them off Netlify into Google Drive.
//
// SECURITY POSTURE — this endpoint is authenticated by a single shared secret
// (BACKUP_TOKEN), which is weaker than the admin login, so its blast radius is
// deliberately minimised:
//
//   * READ ONLY. There is no code path here that writes or deletes anything.
//     A stolen token cannot corrupt the database, the catalog, or the backup
//     history — only read snapshots.
//   * NO ARBITRARY KEYS. It serves "latest", or a key that already appears in
//     the index. A token holder cannot probe the blob store for other objects.
//   * HEADER ONLY. The token is never accepted in a query string, because URLs
//     end up in proxy logs, browser history and Referer headers.
//   * MINIMUM STRENGTH ENFORCED. A short or missing BACKUP_TOKEN disables the
//     endpoint entirely rather than leaving a guessable door open.
//   * EVERY ACCESS IS LOGGED, so use of the token is visible in function logs.
//
// What a stolen token DOES expose: a full copy of accounts (including scrypt
// password hashes), the catalog, and order history. Treat it like a password.
// Rotating it is one env var change and a redeploy — nothing else references it.

const STORE = "backups";
const INDEX_KEY = "index";
const MIN_TOKEN_LENGTH = 32;

function tokenOk(authHeader, expected) {
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const given = Buffer.from(authHeader.slice(7));
  const want = Buffer.from(expected);
  // Compare a fixed-length digest so differing lengths cannot be distinguished
  // by timing, and timingSafeEqual never throws on a length mismatch.
  const h = (b) => crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(h(given), h(want));
}

exports.handler = async (event) => {
  connectLambda(event);
  const base = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const json = (code, body) => ({ statusCode: code, headers: base, body: JSON.stringify(body) });

  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const expected = process.env.BACKUP_TOKEN;
  if (!expected) {
    console.error("backup-fetch called but BACKUP_TOKEN is not set — endpoint disabled");
    return json(503, { error: "Not configured" });
  }
  if (expected.length < MIN_TOKEN_LENGTH) {
    console.error(`BACKUP_TOKEN is shorter than ${MIN_TOKEN_LENGTH} chars — endpoint disabled`);
    return json(503, { error: "Not configured" });
  }
  if (!tokenOk(event.headers?.authorization || event.headers?.Authorization, expected)) {
    console.warn("backup-fetch: rejected an unauthenticated request");
    return json(401, { error: "Not authenticated" });
  }

  try {
    const store = getStore(STORE);
    const index = (await store.get(INDEX_KEY, { type: "json" })) || { snapshots: [] };
    const wanted = (event.queryStringParameters || {}).key || "latest";

    if (wanted === "list") {
      console.log(`backup-fetch: listed ${index.snapshots.length} snapshots`);
      return json(200, { snapshots: index.snapshots });
    }

    const entry = wanted === "latest"
      ? index.snapshots[0]
      : index.snapshots.find((s) => s.key === wanted);
    if (!entry) return json(404, { error: "No snapshot available" });

    const snapshot = await store.get(entry.key, { type: "json" });
    if (!snapshot) return json(410, { error: "Snapshot missing from store" });

    console.log(`backup-fetch: served ${entry.key} (${JSON.stringify(entry.counts)})`);
    return {
      statusCode: 200,
      headers: { ...base, "X-Snapshot-Key": entry.key, "X-Snapshot-Taken-At": entry.takenAt },
      body: JSON.stringify(snapshot),
    };
  } catch (err) {
    console.error("backup-fetch error:", err.message);
    return json(500, { error: "Could not read backups" });
  }
};
