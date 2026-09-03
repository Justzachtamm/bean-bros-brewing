const { connectLambda, getStore } = require("@netlify/blobs");
const db = require("./lib/db");

// Weekly snapshot of everything that cannot be regenerated: customer accounts,
// the catalog, and order history.
//
// Why this exists: Netlify keeps daily database backups for 3 days on this
// plan. That is fine for "the deploy broke something and I noticed today"; it
// is not fine for a bad write or an accidental delete that nobody spots until
// next week. It is also the only copy that survives losing access to the
// Netlify account itself.
//
// Runs as a Netlify SCHEDULED FUNCTION, so it needs no credentials of its own —
// it already has the database in its environment. It writes to a separate Blobs
// store, never to the database, so a bug in here cannot damage live data.

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
// it guards against: if the loss is real — you genuinely cleared the accounts —
// a permanent refusal means the job silently stops producing backups and nobody
// finds out until they need one. So the anomaly is remembered, and if the very
// same shape comes back on the next run it is treated as the real state and
// stored. A transient glitch is skipped; a deliberate change costs one cycle.
function anomalyOf(counts) {
  if (counts.products === 0 && counts.accounts === 0 && counts.orders === 0) {
    return "database looks empty";
  }
  return null;
}

function shapeKey(counts) {
  return `${counts.accounts}/${counts.products}/${counts.orders}`;
}

exports.handler = async (event) => {
  connectLambda(event);
  const store = getStore(STORE);
  const startedAt = Date.now();

  try {
    let index = (await store.get(INDEX_KEY, { type: "json" })) || { snapshots: [] };
    const previous = index.snapshots[0] || null;

    const snapshot = await buildSnapshot();

    // Nothing to protect yet — the very first snapshot is always stored, even
    // of an empty shop, so a new install still gets a baseline.
    const anomaly = index.snapshots.length ? anomalyOf(snapshot.counts) : null;
    if (anomaly) {
      const key = shapeKey(snapshot.counts);
      if (index.pendingAnomaly !== key) {
        index.pendingAnomaly = key;
        await store.setJSON(INDEX_KEY, index);
        console.error(`Backup skipped once: ${anomaly} (${key}). If the next run sees the same, it will be stored.`);
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: false, skipped: anomaly, counts: snapshot.counts, willStoreIfRepeated: true }),
        };
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

    // Prune oldest beyond KEEP. Delete the blob first, then rewrite the index,
    // so a failure here leaves an orphan blob (harmless) rather than an index
    // entry pointing at something that no longer exists.
    const dropped = index.snapshots.slice(KEEP);
    for (const old of dropped) {
      try { await store.delete(old.key); } catch (err) { console.error("prune failed for", old.key, err.message); }
    }
    index.snapshots = index.snapshots.slice(0, KEEP);
    await store.setJSON(INDEX_KEY, index);

    console.log(`Backup ${key} stored:`, JSON.stringify(snapshot.counts), `${Date.now() - startedAt}ms`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, key, counts: snapshot.counts, kept: index.snapshots.length }) };
  } catch (err) {
    // Non-2xx so the failure is visible in Netlify's function logs rather than
    // silently succeeding forever.
    console.error("Backup FAILED:", err.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
