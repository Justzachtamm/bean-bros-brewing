const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const A = require("./lib/accounts");

// Deliberately identical wording whether the address is unknown or the password
// is wrong — anything else turns this endpoint into an account-existence oracle.
const GENERIC = "Invalid email or password.";

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  if (!process.env.ACCOUNT_TOKEN_SECRET) {
    console.error("ACCOUNT_TOKEN_SECRET is not set in the Netlify environment");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Accounts are not configured on the server yet." }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || "{}");
    if (typeof email !== "string" || typeof password !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: GENERIC }) };
    }

    if (await A.isLockedOut(email)) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many attempts. Please try again in 15 minutes." }) };
    }

    const user = await A.findUser(email, { retries: 2 });
    if (!user || !A.verifyPassword(password, user.passwordHash)) {
      await A.recordFailure(email);
      return { statusCode: 401, headers, body: JSON.stringify({ error: GENERIC }) };
    }

    await A.clearFailures(email);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, token: A.issueSession(user.email), user: A.publicUser(user) }),
    };
  } catch (err) {
    console.error("Account login error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not sign you in right now." }) };
  }
};
