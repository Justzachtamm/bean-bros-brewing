const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "accounts";
const THROTTLE_KEY = "login-attempts";

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

function issueSession(email, ttlMs = TOKEN_TTL_MS) {
  const payload = b64url(JSON.stringify({ email: normalizeEmail(email), exp: Date.now() + ttlMs }));
  const sig = b64url(crypto.createHmac("sha256", tokenSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

// Returns the normalized email the token was issued for, or null. Never throws
// on malformed input — a bad token is simply not a session.
function emailFromAuthHeader(authHeader) {
  try {
    if (!authHeader || !String(authHeader).startsWith("Bearer ")) return null;
    const parts = String(authHeader).slice(7).split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = b64url(crypto.createHmac("sha256", tokenSecret()).update(payload).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const { email, exp } = JSON.parse(unb64url(payload).toString("utf8"));
    if (typeof exp !== "number" || exp <= Date.now()) return null;
    if (typeof email !== "string" || !EMAIL_RE.test(email)) return null;
    return email;
  } catch {
    return null;
  }
}

// Convenience for handlers: returns { email } or an HTTP response to return.
function requireSession(event, headers) {
  const email = emailFromAuthHeader(event.headers?.authorization || event.headers?.Authorization);
  if (!email) {
    return {
      error: { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in again." }) },
    };
  }
  return { email };
}

// --- user store -------------------------------------------------------------
// Netlify Blobs reads are EVENTUALLY consistent, and these are Lambda-compat
// functions: `connectLambda` builds its environment context from only
// { deployID, edgeURL, siteID, token } — it never sets `uncachedEdgeURL`, and
// a strongly-consistent read without that throws BlobsConsistencyError. So
// `consistency: "strong"` is NOT available here; asking for it 500s every
// signup and login. (Verified against @netlify/blobs 8.2.0 dist/main.cjs.)
//
// Measured lag after a write in production: ~2.9s. The mitigation is therefore
// application-level — see findUser's `retries`.
function store() {
  return getStore(STORE_NAME);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One blob per user rather than a single `users` array. The array version was
// a read-modify-write of the whole list, so two signups landing together would
// clobber each other and silently drop an account. Per-key writes cannot.
function userKey(email) {
  return "user:" + normalizeEmail(email);
}

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

// `retries` is for callers where a miss is more likely to be replication lag
// than a genuine absence — a customer signing in moments after signing up
// should not be told their password is wrong. The delay applies equally to
// real misses, so it leaks no timing signal about whether an account exists.
async function findUser(email, { retries = 0 } = {}) {
  const key = normalizeEmail(email);
  if (!key) return null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const user = await store().get(userKey(key), { type: "json" });
    if (user) return user;
    if (attempt < retries) await sleep(500);
  }
  return null;
}

// Never returns passwordHash — this is what goes over the wire.
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name || "", email: user.email, address: user.address || {}, createdAt: user.createdAt };
}

async function createUser({ name, email, password }) {
  const key = normalizeEmail(email);
  if (await findUser(key)) return { error: "An account with this email already exists." };
  const user = {
    id: "u_" + crypto.randomBytes(8).toString("hex"),
    name: String(name || "").slice(0, 120),
    email: key,
    passwordHash: hashPassword(password),
    address: {},
    createdAt: new Date().toISOString(),
  };
  await store().setJSON(userKey(key), user);
  return { user };
}

async function updateUser(email, patch) {
  const key = normalizeEmail(email);
  const existing = await findUser(key);
  if (!existing) return null;
  const next = { ...existing };
  if (typeof patch.name === "string") next.name = patch.name.slice(0, 120);
  if (patch.address && typeof patch.address === "object") next.address = patch.address;
  if (patch.newPassword) next.passwordHash = hashPassword(patch.newPassword);
  await store().setJSON(userKey(key), next);
  return next;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) return "Password is too long.";
  return null;
}

function validateEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email)) ? null : "Please enter a valid email address.";
}

// --- login throttling -------------------------------------------------------
// Blobs-backed and deliberately simple: enough to stop online password
// guessing, not a substitute for a real rate limiter at the edge.
async function throttleState() {
  return (await store().get(THROTTLE_KEY, { type: "json" })) || {};
}

async function isLockedOut(email) {
  const key = normalizeEmail(email);
  const state = await throttleState();
  const rec = state[key];
  if (!rec) return false;
  if (Date.now() - rec.first > THROTTLE_WINDOW_MS) return false;
  return rec.count >= MAX_FAILED_ATTEMPTS;
}

async function recordFailure(email) {
  const key = normalizeEmail(email);
  const state = await throttleState();
  const rec = state[key];
  if (!rec || Date.now() - rec.first > THROTTLE_WINDOW_MS) state[key] = { count: 1, first: Date.now() };
  else rec.count += 1;
  // keep the map from growing without bound
  for (const [k, v] of Object.entries(state)) {
    if (Date.now() - v.first > THROTTLE_WINDOW_MS * 4) delete state[k];
  }
  await store().setJSON(THROTTLE_KEY, state);
}

async function clearFailures(email) {
  const key = normalizeEmail(email);
  const state = await throttleState();
  if (state[key]) {
    delete state[key];
    await store().setJSON(THROTTLE_KEY, state);
  }
}

module.exports = {
  TOKEN_TTL_MS, MIN_PASSWORD_LENGTH, MAX_FAILED_ATTEMPTS,
  hashPassword, verifyPassword,
  issueSession, emailFromAuthHeader, requireSession,
  normalizeEmail, findUser, createUser, updateUser, publicUser, userKey,
  validatePassword, validateEmail,
  isLockedOut, recordFailure, clearFailures,
};
