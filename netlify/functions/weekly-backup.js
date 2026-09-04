const { connectLambda } = require("@netlify/blobs");
const { runBackup } = require("./lib/backup");

// The Sunday schedule (see netlify.toml: schedule = "0 8 * * 0").
//
// All the actual work lives in lib/backup.js so the same code path can also be
// run on demand by admin-run-backup.js — Netlify returns 403 to any direct HTTP
// request to a scheduled function, so this file can never be triggered manually.
//
// Runs inside Netlify, so it needs no credentials: the database is already in
// its environment.

exports.handler = async (event) => {
  connectLambda(event);
  try {
    const result = await runBackup();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    // Non-2xx so the failure is visible in Netlify's function logs rather than
    // silently succeeding forever.
    console.error("Backup FAILED:", err.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
