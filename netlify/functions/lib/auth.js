const crypto = require("crypto");

// Verifies the signed admin session token issued by admin-login.js.
// Token format: base64(JSON.stringify({exp})) + "." + hmacSha256Base64(payload, secret)
function verifyAdminToken(authHeader, secret) {
  if (!secret || !authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;

  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

module.exports = { verifyAdminToken };
