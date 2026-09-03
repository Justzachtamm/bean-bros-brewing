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
      // A bare count is not enough to decide on. saveProducts() replaces the
      // catalog wholesale — anything absent from the imported list is DELETED —
      // so if Blobs holds fewer products than Postgres, importing silently
      // removes the difference from the live shop. Show exactly what would
      // change, by name, before anyone commits to it.
      const pgProducts = await getProducts();
      const brief = (p) => ({
        id: p.id, name: p.name, price: p.price, stock: p.stock,
        active: p.active !== false, hasImage: !!p.imageKey,
      });
      const byId = (list) => new Map((list || []).map((p) => [p.id, p]));
      const blobById = byId(Array.isArray(blobProducts) ? blobProducts : []);
      const pgById = byId(pgProducts);

      const wouldBeDeleted = pgProducts.filter((p) => !blobById.has(p.id)).map(brief);
      const wouldBeAdded = (Array.isArray(blobProducts) ? blobProducts : [])
        .filter((p) => !pgById.has(p.id)).map(brief);
      const wouldChange = [];
      for (const [id, b] of blobById) {
        const cur = pgById.get(id);
        if (!cur) continue;
        const fields = {};
        if (Number(cur.price) !== Number(b.price)) fields.price = { from: Number(cur.price), to: Number(b.price) };
        if (cur.stock !== b.stock) fields.stock = { from: cur.stock, to: b.stock };
        if ((cur.name || "") !== (b.name || "")) fields.name = { from: cur.name, to: b.name };
        if (!!cur.imageKey !== !!b.imageKey) fields.image = { from: !!cur.imageKey, to: !!b.imageKey };
        if ((cur.active !== false) !== (b.active !== false)) fields.active = { from: cur.active !== false, to: b.active !== false };
        if (Object.keys(fields).length) wouldChange.push({ id, name: b.name, fields });
      }

      const orderPreview = (Array.isArray(blobOrders) ? blobOrders : []).slice(0, 20).map((o) => ({
        id: o.id, date: o.date, total: o.total, status: o.status,
        items: (o.items || []).length, hasTracking: !!o.trackingNumber,
      }));

      return json(200, {
        mode: "dry-run",
        ...summary,
        catalogImportWould: {
          DELETE: wouldBeDeleted,
          ADD: wouldBeAdded,
          CHANGE: wouldChange,
          warning: wouldBeDeleted.length
            ? `Importing the catalog would REMOVE ${wouldBeDeleted.length} product(s) from the live shop. Use scope:"orders" to take the orders only.`
            : null,
        },
        ordersImportWould: { ADD: orderPreview },
        howToImport: {
          everything: 'POST with body {"scope":"all"}',
          ordersOnly: 'POST with body {"scope":"orders"}  <-- safe, never touches the catalog',
          productsOnly: 'POST with body {"scope":"products"}',
        },
      });
    }

    // Scope lets the orders be recovered without betting the catalog on the
    // same call. Defaults to "all" so an old client calling with no body still
    // behaves as before.
    let scope = "all";
    try {
      const parsed = JSON.parse(event.body || "{}");
      if (parsed && typeof parsed.scope === "string") scope = parsed.scope;
    } catch { /* no body is fine */ }
    if (!["all", "orders", "products"].includes(scope)) {
      return json(400, { error: 'scope must be "all", "orders" or "products"' });
    }

    const result = { scope, ...summary, imported: { orders: 0, skipped: 0, failed: [] }, products: "skipped" };

    for (const o of (scope === "products" ? [] : (Array.isArray(blobOrders) ? blobOrders : []))) {
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
    if (scope !== "orders" && Array.isArray(blobProducts) && blobProducts.length) {
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

    if (scope === "orders") result.products = "skipped — scope was \"orders\"";

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
