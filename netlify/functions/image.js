const { getStore, connectLambda } = require("@netlify/blobs");
const { corsHeaders } = require("./lib/cors");

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const key = event.queryStringParameters?.key;
  if (!key) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing key" }) };
  }

  const store = getStore("images");
  const [data, metadata] = await Promise.all([
    store.get(key, { type: "arrayBuffer" }),
    store.getMetadata(key),
  ]);

  if (!data) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: "Image not found" }) };
  }

  return {
    statusCode: 200,
    headers: {
      ...headers,
      "Content-Type": metadata?.metadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: Buffer.from(data).toString("base64"),
    isBase64Encoded: true,
  };
};
