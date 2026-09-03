const { connectLambda, getStore } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

// Read access to the weekly snapshots written by weekly-backup.js.
//
//   GET                 -> list snapshots (dates, row counts, sizes)
//   GET ?key=<key>      -> download one snapshot as JSON
//   GET ?key=latest     -> download the most recent
//
// Admin-only, and read-only by design: nothing here can write or delete a
// snapshot, so a stolen admin token cannot destroy the backup history.

const STORE = "backups";
const INDEX_KEY = "index";

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  const json = (code, body) => ({
    statusCode: code,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body, null, 2),
  });

  try {
    const store = getStore(STORE);
    const index = (await store.get(INDEX_KEY, { type: "json" })) || { snapshots: [] };
    const wanted = (event.queryStringParameters || {}).key;

    if (!wanted) {
      return json(200, {
        snapshots: index.snapshots,
        note: index.snapshots.length
          ? "Add ?key=latest (or ?key=<key>) to download one."
          : "No snapshots yet — the job runs Sundays 08:00 UTC. Hit /.netlify/functions/weekly-backup once to make the first one.",
      });
    }

    const entry = wanted === "latest" ? index.snapshots[0] : index.snapshots.find((s) => s.key === wanted);
    if (!entry) return json(404, { error: "No such snapshot", available: index.snapshots.map((s) => s.key) });

    const snapshot = await store.get(entry.key, { type: "json" });
    if (!snapshot) return json(410, { error: "Snapshot listed but missing from the store", key: entry.key });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="bean-bros-${entry.takenAt.slice(0, 10)}.json"`,
      },
      body: JSON.stringify(snapshot),
    };
  } catch (err) {
    console.error("Backup listing error:", err.message);
    return json(500, { error: "Could not read backups", detail: err.message });
  }
};
