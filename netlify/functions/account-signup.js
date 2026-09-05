const { connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");
const A = require("./lib/accounts");
const { consumeLimit, clientIp } = require("./lib/rate-limit");

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
    if (!await consumeLimit(`signup:${clientIp(event)}`, 10, 3600)) {
      return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many signup attempts. Please try again later." }) };
    }
    const { name, email, password } = JSON.parse(event.body || "{}");
    const emailError = A.validateEmail(email);
    if (emailError) return { statusCode: 400, headers, body: JSON.stringify({ error: emailError }) };
    const pwError = A.validatePassword(password);
    if (pwError) return { statusCode: 400, headers, body: JSON.stringify({ error: pwError }) };

    const { user, error } = await A.createUser({ name, email, password });
    if (error) return { statusCode: 409, headers, body: JSON.stringify({ error }) };

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, token: A.issueSession(user), user: A.publicUser(user) }),
    };
  } catch (err) {
    console.error("Account signup error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not create your account right now." }) };
  }
};
