const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const A = require("./lib/accounts");

// Session restore on page load, and profile updates. The email always comes
// from the verified token, never from the request body.
exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!process.env.ACCOUNT_TOKEN_SECRET) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Accounts are not configured on the server yet." }) };
  }

  const session = A.requireSession(event, headers);
  if (session.error) return session.error;

  try {
    if (event.httpMethod === "GET") {
      const user = await A.findUser(session.email);
      if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in again." }) };
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ ok: true, user: A.publicUser(user) }),
      };
    }

    const { name, address, currentPassword, newPassword } = JSON.parse(event.body || "{}");
    const user = await A.findUser(session.email);
    if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: "Please sign in again." }) };

    const patch = {};
    if (typeof name === "string") patch.name = name;
    if (address && typeof address === "object") patch.address = address;

    if (newPassword) {
      // Changing a password requires proving you know the current one, so a
      // stolen session token can't be used to lock the real owner out.
      if (!A.verifyPassword(String(currentPassword || ""), user.passwordHash)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Your current password is incorrect." }) };
      }
      const pwError = A.validatePassword(newPassword);
      if (pwError) return { statusCode: 400, headers, body: JSON.stringify({ error: pwError }) };
      patch.newPassword = newPassword;
    }

    const updated = await A.updateUser(session.email, patch);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, user: A.publicUser(updated) }),
    };
  } catch (err) {
    console.error("Account me error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not load your account right now." }) };
  }
};
