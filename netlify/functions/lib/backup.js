const { getStore } = require("@netlify/blobs");
const db = require("./db");

// The snapshot logic, factored out of weekly-backup.js so it can be run from
// TWO places:
//
//   * netlify/functions/weekly-backup.js   — the Sunday schedule
//   * netlify/functions/admin-run-backup.js — on demand, admin-authenticated
//
// The on-demand path exists because Netlify's infrastructure returns 403 to any
// direct HTTP request to a scheduled function, before our code runs. That is
// correct for a cron job, but it left no way to produce the FIRST snapshot, or
// to take one before a risky change, without waiting for Sunday.

const STORE = "backups";
const INDEX_KEY = "index";
const KEEP = 12; // ~3 months of weekly snapshots

// accounts.password_hash IS included: a backup that cannot restore a login is
// not a backup. These are scrypt hashes, not passwords, and they sit inside the
// same Netlify account as the database itself, so this adds no new exposure.
const TABLES = {
  accounts: "SELECT * FROM accounts ORDER BY created_at",
  products: "SELECT * FROM products ORDER BY id",
  orders:   "SELECT * FROM orders ORDER BY ordered_at",
};

async function buildSnapshot() {
  const snapshot = { takenAt: new Date().toISOString(), version: 1, tables: {}, counts: {} };
  for (const [name, sql] of Object.entries(TABLES)) {
    const rows = await db.query(sql);
    snapshot.tables[name] = rows;
    snapshot.counts[name] = rows.length;
  }
  return snapshot;
}

// A snapshot that suddenly loses everything is more likely a failure (a
// half-migrated database, a connection to the wrong branch, a partial read)
// than a real state. Storing it would push a good snapshot out of the retention
// window, so an anomaly is skipped the first time it is seen.
//
// But ONLY the first time. A guard that refuses forever is worse than the thing
// it guards against: if the loss is real, a permanent refusal means the job
// silently stops producing backups and nobody finds out until they need one. So
// the anomaly is remembered, and if the same shape returns on the next run it is
// treated as the real state and stored.
function anomalyOf(counts) {
  if (counts.products === 0 && counts.accounts === 0 && counts.orders === 0) {
    return "database looks empty";
  }
  return null;
}

function shapeKey(counts) {
  return `${counts.accounts}/${counts.products}/${counts.orders}`;
}

// Returns { ok, key?, counts, kept?, skipped? }.
async function runBackup({ force = false } = {}) {
  const store = getStore(STORE);
  const startedAt = Date.now();
  const index = (await store.get(INDEX_KEY, { type: "json" })) || { snapshots: [] };

  const snapshot = await buildSnapshot();

  // The very first snapshot is always stored, even of an empty shop, so a new
  // install still gets a baseline. `force` lets an admin override the guard
  // deliberately when they know the state is real.
  const anomaly = (index.snapshots.length && !force) ? anomalyOf(snapshot.counts) : null;
  if (anomaly) {
    const key = shapeKey(snapshot.counts);
    if (index.pendingAnomaly !== key) {
      index.pendingAnomaly = key;
      await store.setJSON(INDEX_KEY, index);
      console.error(`Backup skipped once: ${anomaly} (${key}). If the next run sees the same, it will be stored.`);
      return { ok: false, skipped: anomaly, counts: snapshot.counts, willStoreIfRepeated: true };
    }
    console.warn(`Anomaly ${key} repeated — treating as the real state and storing it.`);
  }
  delete index.pendingAnomaly;

  const key = `snapshot-${snapshot.takenAt.slice(0, 10)}-${Date.now()}.json`;
  await store.setJSON(key, snapshot);

  index.snapshots.unshift({
    key,
    takenAt: snapshot.takenAt,
    counts: snapshot.counts,
    bytes: JSON.stringify(snapshot).length,
  });

  // Prune oldest beyond KEEP. Delete the blob first, then rewrite the index, so
  // a failure here leaves an orphan blob (harmless) rather than an index entry
  // pointing at something that no longer exists.
  for (const old of index.snapshots.slice(KEEP)) {
    try { await store.delete(old.key); } catch (err) { console.error("prune failed for", old.key, err.message); }
  }
  index.snapshots = index.snapshots.slice(0, KEEP);
  await store.setJSON(INDEX_KEY, index);

  console.log(`Backup ${key} stored:`, JSON.stringify(snapshot.counts), `${Date.now() - startedAt}ms`);
  return { ok: true, key, counts: snapshot.counts, kept: index.snapshots.length };
}

module.exports = { runBackup, buildSnapshot, anomalyOf, shapeKey, STORE, INDEX_KEY, KEEP };
