const { connectLambda, getStore } = require("@netlify/blobs");
const { verifyAdminToken } = require("./lib/auth");
const { corsHeaders } = require("./lib/cors");
const db = require("./lib/db");
const { addOrder } = require("./lib/orders");
const { saveProducts, getProducts } = require("./lib/products");

// ONE-TIME import of the orders and catalog that were living in Netlify Blobs
// before they moved to Postgres. Admin-only, idempotent, and non-destructive:
// the Blobs values are read, never written or deleted, so this can be re-run
// and the old data stays put as a fallback until you are satisfied.
//
// GET  → dry run: reports what IS in Blobs and what IS already in Postgres.
// POST → performs the import.
//
// Delete this function once the import is done and verified.

async function readBlob(storeName, key) {
  try {
    return await getStore(storeName).get(key, { type: "json" });
  } catch (err) {
    return { __error: err.message };
  }
}

exports.handler = async (event) => {
  connectLambda(event);
  const headers = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!verifyAdminToken(event.headers?.authorization || event.headers?.Authorization, process.env.ADMIN_TOKEN_SECRET)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Not authenticated" }) };
  }

  const json = (statusCode, body) => ({
    statusCode,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body, null, 2),
  });

  try {
    const blobOrders = (await readBlob("orders", "log")) || [];
    const blobProducts = (await readBlob("products", "catalog")) || [];
    const pgOrderCount = (await db.one("SELECT count(*)::int AS n FROM orders")).n;
    const pgProductCount = (await db.one("SELECT count(*)::int AS n FROM products")).n;

    const summary = {
      blobs: {
        orders: Array.isArray(blobOrders) ? blobOrders.length : "unreadable",
        products: Array.isArray(blobProducts) ? blobProducts.length : "unreadable",
      },
      postgres: { orders: pgOrderCount, products: pgProductCount },
    };

    if (event.httpMethod === "GET") {
      return json(200, {
        mode: "dry-run",
        ...summary,
        note: "POST to this endpoint to import. Orders dedupe on sessionId; the catalog is only imported when Postgres has not been edited yet.",
      });
    }

    const result = { ...summary, imported: { orders: 0, skipped: 0, failed: [] }, products: "skipped" };

    for (const o of Array.isArray(blobOrders) ? blobOrders : []) {
      // Older rows may predate the sessionId field. Fall back to the order id
      // so they still get a stable idempotency key instead of being dropped.
      const sessionId = o.sessionId || o.id;
      if (!o.id || !sessionId) {
        result.imported.failed.push({ id: o.id || null, reason: "missing id" });
        continue;
      }
      try {
        const { created } = await addOrder({ ...o, sessionId });
        created ? result.imported.orders++ : result.imported.skipped++;
      } catch (err) {
        result.imported.failed.push({ id: o.id, reason: err.message });
      }
    }

    // The catalog is only imported into a table that is still exactly the
    // seeded defaults. If the admin has already edited products in Postgres,
    // importing the older Blobs catalog would silently undo that work.
    if (Array.isArray(blobProducts) && blobProducts.length) {
      const current = await getProducts();
      const untouched = current.every((p) => {
        const seed = require("./lib/products").DEFAULT_PRODUCTS.find((d) => d.id === p.id);
        return seed && seed.price === p.price && seed.stock === p.stock && !p.imageKey;
      });
      if (untouched) {
        await saveProducts(blobProducts.map((p, i) => ({ ...p, sortOrder: i })));
        result.products = `imported ${blobProducts.length}`;
      } else {
        result.products = "skipped — Postgres catalog has already been edited; import would overwrite it";
      }
    }

    result.postgresAfter = {
      orders: (await db.one("SELECT count(*)::int AS n FROM orders")).n,
      products: (await db.one("SELECT count(*)::int AS n FROM products")).n,
    };
    return json(200, result);
  } catch (err) {
    console.error("Blob import error:", err.message);
    return json(500, { error: "Import failed", detail: err.message });
  }
};
