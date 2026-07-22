const { connectLambda } = require("@netlify/blobs");
const { getProducts, saveProducts } = require("./lib/products");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");

function validateProducts(products) {
  if (!Array.isArray(products)) return "Body must be an array of products";
  for (const p of products) {
    if (typeof p.id !== "number") return "Every product needs a numeric id";
    if (typeof p.name !== "string" || !p.name.trim()) return "Every product needs a name";
    if (typeof p.price !== "number" || p.price < 0) return "Every product needs a non-negative price";
    if (typeof p.stock !== "number" || p.stock < 0) return "Every product needs a non-negative stock count";
  }
  return null;
}

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    const products = await getProducts();
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(products),
    };
  }

  if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
    if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
    }
    let products;
    try {
      products = JSON.parse(event.body || "[]");
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    const error = validateProducts(products);
    if (error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error }) };
    }
    await saveProducts(products);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, products }),
    };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
