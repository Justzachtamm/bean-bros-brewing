const { corsHeaders } = require("./lib/cors");
const A = require("./lib/accounts");
const db = require("./lib/db");

exports.handler = async (event) => {
  const headers = corsHeaders(event, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "{}" };
  try {
    const session = await A.requireSession(event, headers, { allowUnverified: true });
    if (session.error) return session.error;
    await db.query("UPDATE accounts SET session_version = session_version + 1 WHERE id = $1", [session.user.id]);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Could not sign out. Please try again." }) };
  }
};
