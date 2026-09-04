const { connectLambda } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const { runBackup } = require("./lib/backup");

// Take a database snapshot RIGHT NOW, admin-authenticated.
//
// Netlify blocks direct HTTP invocation of scheduled functions (403), which is
// correct for a cron job but leaves no way to produce the first snapshot or to
// grab one before a risky change. This is that door, behind the admin login.
//
// POST {"force": true} overrides the empty-database guard — only use it when you
// know the current state is real.

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  let force = false;
  try { force = !!JSON.parse(event.body || "{}").force; } catch { /* no body is fine */ }

  try {
    const result = await runBackup({ force });
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(result, null, 2),
    };
  } catch (err) {
    console.error("Manual backup failed:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
