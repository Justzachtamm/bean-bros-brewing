const crypto = require("crypto");
const db = require("./db");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_FAILED_ATTEMPTS = 8;
const THROTTLE_WINDOW_MS = 1000 * 60 * 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- password hashing -------------------------------------------------------
// scrypt from node's own crypto — no new dependency, and unlike the 32-bit
// string hash this replaces, it is salted and deliberately slow.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `s1$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

function verifyPassword(password, stored) {
  try {
    const [v, N, r, p, saltHex, keyHex] = String(stored || "").split("$");
    if (v !== "s1") return false;
    const key = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), keyHex.length / 2, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// --- session tokens ---------------------------------------------------------
// Same HMAC construction as the admin token in lib/auth.js, but the payload
// carries the account's email. Every account endpoint reads the email FROM
// HERE and never from the request body — that is the whole point of this file.
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function tokenSecret() {
  const s = process.env.ACCOUNT_TOKEN_SECRET;
  if (!s) throw new Error("ACCOUNT_TOKEN_SECRET is not set");
  return s;
}

function issueSession(user, ttlMs = TOKEN_TTL_MS) {
  if (!user?.id) throw new Error("An account is required to issue a session");
  const payload = b64url(JSON.stringify({ email: normalizeEmail(user.email), sub: user.id, ver: user.sessionVersion, exp: Date.now() + ttlMs }));
  const sig = b64url(crypto.createHmac("sha256", tokenSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

// Returns the normalized email the token was issued for, or null. Never throws
// on malformed input — a bad token is simply not a session.
function sessionFromAuthHeader(authHeader) {
  try {
    if (!authHeader || !String(authHeader).startsWith("Bearer ")) return null;
    const parts = String(authHeader).slice(7).split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = b64url(crypto.createHmac("sha256", tokenSecret()).update(payload).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const { email, exp, sub, ver } = JSON.parse(unb64url(payload).toString("utf8"));
    if (typeof exp !== "number" || exp <= Date.now()) return null;
    if (typeof email !== "string" || !EMAIL_RE.test(email)) return null;
    if (typeof sub !== "string" || !Number.isInteger(ver)) return null;
    return { email, sub, ver };
  } catch {
    return null;
  }
}

// Every protected request checks account existence, revocation and verification.
async function requireSession(event, headers, { allowUnverified = false } = {}) {
  const claim = sessionFromAuthHeader(event.headers?.authorization || event.headers?.Authorization);
  const user = claim ? await findUser(claim.email) : null;
  const error = (statusCode, message, code) => ({ error: {
    statusCode, headers: { ...headers, "Cache-Control": "no-store" },
    body: JSON.stringify({ error: message, code }),
  } });
  if (!user || claim.sub !== user.id || claim.ver !== user.sessionVersion) {
    return error(401, "Please sign in again.", "SIGN_IN_REQUIRED");
  }
  if (!allowUnverified && !user.emailVerified) {
    return error(403, "Verify your email in your account before accessing orders or billing.", "EMAIL_NOT_VERIFIED");
  }
  return { email: user.email, user };
}

function emailFromAuthHeader(header) {
  return sessionFromAuthHeader(header)?.email || null;
}

// --- user store (Postgres) -------------------------------------------------
// Postgres gives read-after-write, so the retry/lag machinery this file needed
// against Netlify Blobs is gone. `findUser` still accepts an options argument
// so callers did not have to change; it is deliberately ignored.
function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

const USER_COLUMNS = "id, email, name, password_hash, address, created_at, email_verified_at, session_version, stripe_customer_id";

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    passwordHash: row.password_hash,
    emailVerified: !!row.email_verified_at,
    sessionVersion: row.session_version,
    stripeCustomerId: row.stripe_customer_id,
    address: row.address || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function findUser(email) {
  const key = normalizeEmail(email);
  if (!key) return null;
  return rowToUser(await db.one(`SELECT ${USER_COLUMNS} FROM accounts WHERE email = $1`, [key]));
}

// Never returns passwordHash — this is what goes over the wire.
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name || "", email: user.email, address: user.address || {}, createdAt: user.createdAt, emailVerified: user.emailVerified };
}

// ON CONFLICT DO NOTHING makes the duplicate check ATOMIC. The previous version
// read first and then wrote, which under an eventually-consistent store let two
// signups for the same email both believe they were first.
async function createUser({ name, email, password }) {
  const key = normalizeEmail(email);
  const row = await db.one(
    `INSERT INTO accounts (id, email, name, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${USER_COLUMNS}`,
    ["u_" + crypto.randomBytes(8).toString("hex"), key, String(name || "").slice(0, 120), hashPassword(password)]
  );
  if (!row) return { error: "An account with this email already exists." };
  return { user: rowToUser(row) };
}

// COALESCE keeps every column the caller did not mention, so a name-only update
// cannot blank out an address.
async function updateUser(email, patch) {
  const key = normalizeEmail(email);
  const row = await db.one(
    `UPDATE accounts SET
       name          = COALESCE($2, name),
       address       = COALESCE($3::jsonb, address),
       password_hash = COALESCE($4, password_hash),
       session_version = session_version + CASE WHEN $4::text IS NULL THEN 0 ELSE 1 END,
       updated_at    = now()
     WHERE email = $1
     RETURNING ${USER_COLUMNS}`,
    [
      key,
      typeof patch.name === "string" ? patch.name.slice(0, 120) : null,
      patch.address && typeof patch.address === "object" ? JSON.stringify(patch.address) : null,
      patch.newPassword ? hashPassword(patch.newPassword) : null,
    ]
  );
  return rowToUser(row);
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return "Password is too long.";
  return null;
}

function validateEmail(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(normalizeEmail(email)) ? null : "Please enter a valid email address.";
}

// --- login throttling -------------------------------------------------------
// Window reset and increment happen in ONE statement, so two failed logins
// arriving together cannot lose a count.
async function isLockedOut(email) {
  const row = await db.one(
    `SELECT fail_count FROM account_login_attempts
     WHERE email = $1 AND window_at > now() - ($2 || ' milliseconds')::interval`,
    [normalizeEmail(email), String(THROTTLE_WINDOW_MS)]
  );
  return !!row && row.fail_count >= MAX_FAILED_ATTEMPTS;
}

async function recordFailure(email) {
  await db.query(
    `INSERT INTO account_login_attempts (email, fail_count, window_at)
     VALUES ($1, 1, now())
     ON CONFLICT (email) DO UPDATE SET
       fail_count = CASE
         WHEN account_login_attempts.window_at > now() - ($2 || ' milliseconds')::interval
         THEN account_login_attempts.fail_count + 1
         ELSE 1
       END,
       window_at = CASE
         WHEN account_login_attempts.window_at > now() - ($2 || ' milliseconds')::interval
         THEN account_login_attempts.window_at
         ELSE now()
       END`,
    [normalizeEmail(email), String(THROTTLE_WINDOW_MS)]
  );
}

async function clearFailures(email) {
  await db.query(`DELETE FROM account_login_attempts WHERE email = $1`, [normalizeEmail(email)]);
}

module.exports = {
  TOKEN_TTL_MS, MIN_PASSWORD_LENGTH, MAX_FAILED_ATTEMPTS,
  hashPassword, verifyPassword,
  issueSession, emailFromAuthHeader, sessionFromAuthHeader, requireSession, rowToUser, USER_COLUMNS,
  normalizeEmail, findUser, createUser, updateUser, publicUser,
  validatePassword, validateEmail,
  isLockedOut, recordFailure, clearFailures,
};
