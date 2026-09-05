const crypto = require("crypto");
const { corsHeaders } = require("./lib/cors");
const A = require("./lib/accounts");
const db = require("./lib/db");
const mail = require("./lib/email");
const { consumeLimit } = require("./lib/rate-limit");

function codeHash(id, code) {
  return crypto.createHmac("sha256", process.env.ACCOUNT_TOKEN_SECRET)
    .update(`${id}:${code}`).digest("hex");
}

exports.handler = async (event) => {
  const headers = corsHeaders(event, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  const json = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const session = await A.requireSession(event, headers, { allowUnverified: true });
    if (session.error) return session.error;
    const { user } = session;
    if (user.emailVerified) return json(200, { ok: true, token: A.issueSession(user), user: A.publicUser(user) });
    const { action, code } = JSON.parse(event.body || "{}");
    if (action === "send") {
      if (!mail.isConfigured()) return json(503, { error: "Email verification is temporarily unavailable. Please try again later or contact hello@beanbrosbrewingco.com." });
      if (!await consumeLimit(`verify-email:${user.email}`, 5, 3600)) {
        return json(429, { error: "Too many requests. Please try again in an hour." });
      }
      const value = String(crypto.randomInt(10000000, 100000000));
      const hash = codeHash(user.id, value);
      const row = await db.one(`UPDATE accounts SET verification_hash = $2,
        verification_sent_at = now(), verification_expires_at = now() + interval '15 minutes',
        verification_attempts = 0 WHERE id = $1 AND email_verified_at IS NULL
        AND (verification_sent_at IS NULL OR verification_sent_at < now() - interval '60 seconds')
        RETURNING id`, [user.id, hash]);
      if (!row) return json(429, { error: "Please wait a minute before requesting another code." });
      const result = await mail.send({ to: user.email, subject: "Verify your Bean Bros email",
        text: `Your Bean Bros verification code is ${value}. It expires in 15 minutes. Enter it in your account to verify your email. If you did not request this, ignore this email.`,
        html: `<p>Your Bean Bros verification code is <strong>${value}</strong>.</p><p>It expires in 15 minutes. Enter it in your account to verify your email. If you did not request this, ignore this email.</p>`,
        tag: "email-verification" });
      if (!result.ok) {
        await db.query("UPDATE accounts SET verification_hash = NULL WHERE id = $1 AND verification_hash = $2", [user.id, hash]);
        return json(502, { error: "We could not send the code. Please try again shortly." });
      }
      return json(200, { ok: true, message: "Check your email for an eight-digit code." });
    }
    if (action !== "verify" || typeof code !== "string" || !/^\d{8}$/.test(code)) {
      return json(400, { error: "Enter the eight-digit code from your email." });
    }
    // Lock the account while counting and consuming the one-use code.
    const client = await db.connection().pool.connect();
    let verified;
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(`UPDATE accounts SET verification_attempts = verification_attempts + 1
        WHERE id = $1 AND email_verified_at IS NULL AND verification_hash IS NOT NULL
        AND verification_expires_at > now() AND verification_attempts < 5 RETURNING verification_hash`, [user.id]);
      const expected = rows[0]?.verification_hash;
      const given = codeHash(user.id, code);
      if (expected && expected.length === given.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) {
        const result = await client.query(`UPDATE accounts SET email_verified_at = now(),
          verification_hash = NULL, verification_expires_at = NULL, session_version = session_version + 1
          WHERE id = $1 RETURNING ${A.USER_COLUMNS}`, [user.id]);
        verified = A.rowToUser(result.rows[0]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally { client.release(); }
    if (!verified) return json(400, { error: "That code is invalid, expired, or has too many attempts. Request a new code." });
    return json(200, { ok: true, token: A.issueSession(verified), user: A.publicUser(verified) });
  } catch (err) {
    console.error("Email verification failed:", err.name);
    return json(500, { error: "Could not verify your email right now." });
  }
};
