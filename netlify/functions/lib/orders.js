const db = require("./db");

// Orders live one-row-per-order in Postgres. The previous version kept every
// order in a single Blobs JSON array and rewrote the whole array on each
// write, which lost concurrent orders outright; see the migration for detail.

const COLUMNS = `id, session_id, customer_id, customer_name, customer_email,
                 items, total, status, shipping_address, tracking_number,
                 label_key, shipment_id, extra, ordered_at`;

// The rest of the codebase (admin UI, label flows, storefront) speaks camelCase
// and expects `date`. Translate at the boundary so nothing else has to change.
function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    customerId: row.customer_id || "",
    customerName: row.customer_name || "",
    customerEmail: row.customer_email || "",
    items: row.items || [],
    total: row.total === null || row.total === undefined ? 0 : Number(row.total),
    status: row.status,
    shippingAddress: row.shipping_address || null,
    trackingNumber: row.tracking_number,
    labelKey: row.label_key,
    shipmentId: row.shipment_id,
    date: row.ordered_at instanceof Date ? row.ordered_at.toISOString() : row.ordered_at,
    ...(row.extra || {}),
  };
}

async function getOrders() {
  const rows = await db.query(`SELECT ${COLUMNS} FROM orders ORDER BY ordered_at DESC`);
  return rows.map(toOrder);
}

// Orders for one customer, filtered and sorted in SQL rather than by pulling
// every order in the system into the function and filtering in JS.
async function getOrdersByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return [];
  const rows = await db.query(
    `SELECT ${COLUMNS} FROM orders WHERE lower(customer_email) = $1 ORDER BY ordered_at DESC`,
    [key]
  );
  return rows.map(toOrder);
}

async function getOrderById(id) {
  const row = await db.one(`SELECT ${COLUMNS} FROM orders WHERE id = $1`, [String(id)]);
  return toOrder(row);
}

// Idempotent on sessionId, atomically. ON CONFLICT DO NOTHING means a Stripe
// webhook redelivery inserts nothing and RETURNING yields no row — which is
// how the caller knows not to decrement stock a second time.
//
// Returns { order, created }. `created` is false for a duplicate.
async function addOrder(order) {
  const row = await db.one(
    `INSERT INTO orders (id, session_id, customer_id, customer_name, customer_email,
                         items, total, status, shipping_address, tracking_number,
                         label_key, ordered_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10,$11,COALESCE($12::timestamptz, now()))
     ON CONFLICT (session_id) DO NOTHING
     RETURNING ${COLUMNS}`,
    [
      String(order.id),
      String(order.sessionId),
      order.customerId || "",
      order.customerName || "",
      order.customerEmail || "",
      JSON.stringify(order.items || []),
      Number(order.total || 0),
      order.status || "Paid",
      order.shippingAddress ? JSON.stringify(order.shippingAddress) : null,
      order.trackingNumber || null,
      order.labelKey || null,
      order.date || null,
    ]
  );
  if (row) return { order: toOrder(row), created: true };
  // Already recorded — hand back the existing row so callers can still respond
  // with the order rather than treating a retry as a failure.
  const existing = await db.one(`SELECT ${COLUMNS} FROM orders WHERE session_id = $1`, [String(order.sessionId)]);
  return { order: toOrder(existing), created: false };
}

const COLUMN_FOR = {
  status: "status",
  trackingNumber: "tracking_number",
  labelKey: "label_key",
  shipmentId: "shipment_id",
  customerName: "customer_name",
  customerEmail: "customer_email",
  shippingAddress: "shipping_address",
};
const JSON_COLUMNS = new Set(["shipping_address"]);

// Patch keys that map to real columns are written to those columns; anything
// else (labelCreationStartedAt, future ad-hoc flags) is merged into `extra`.
// Merging server-side with || means a concurrent patch of a different key
// cannot wipe this one, which the read-modify-write version could.
async function updateOrder(id, patch) {
  const sets = [];
  const params = [String(id)];
  const extra = {};

  for (const [key, value] of Object.entries(patch || {})) {
    const column = COLUMN_FOR[key];
    if (column) {
      params.push(JSON_COLUMNS.has(column) ? (value === null ? null : JSON.stringify(value)) : value);
      sets.push(`${column} = $${params.length}${JSON_COLUMNS.has(column) ? "::jsonb" : ""}`);
    } else {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length) {
    params.push(JSON.stringify(extra));
    sets.push(`extra = extra || $${params.length}::jsonb`);
  }
  if (!sets.length) return getOrderById(id);

  sets.push("updated_at = now()");
  const row = await db.one(
    `UPDATE orders SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLUMNS}`,
    params
  );
  return toOrder(row);
}

module.exports = { getOrders, getOrdersByEmail, getOrderById, addOrder, updateOrder, toOrder };
