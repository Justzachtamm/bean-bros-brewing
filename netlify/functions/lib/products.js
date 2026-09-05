const db = require("./db");

// The catalog moved off Netlify Blobs into Postgres so that stock can be
// decremented ATOMICALLY. The Blobs version read the whole catalog, subtracted
// in JS, and wrote the whole catalog back — two checkouts landing together each
// took stock from the same starting number and one decrement was lost, which is
// how you oversell. See the migration for the full reasoning.

// Canonical seed data, merged from the site's original hardcoded storefront
// and admin arrays. Full bios come from the storefront copy (they were complete
// there; the admin copy had them truncated with "..."). Used ONLY to populate an
// empty table on first run; after that Postgres is the source of truth.
const DEFAULT_PRODUCTS = [
  { id: 1, name: "Ethiopian Yirgacheffe", origin: "Ethiopia", region: "Yirgacheffe, Sidamo", altitude: "1,750 - 2,200m", tastingNotes: "Blueberry · Jasmine · Honey", bio: "Grown in the birthplace of coffee, this Yirgacheffe showcases bright, wine-like acidity with delicate floral notes. Sun-dried on raised beds, each bean carries the terroir of ancient Ethiopian soil.", roast: "Light Roast", price: 18.99, weight: "16 oz", stock: 45, active: true, badge: "Popular", badgeColor: "#3b82f6", imageKey: null },
  { id: 2, name: "Colombian Supremo", origin: "Colombia", region: "Huila, Nariño", altitude: "1,500 - 2,000m", tastingNotes: "Caramel · Walnut · Citrus", bio: "From the misty highlands of Huila, these supremo-grade beans are washed and sun-dried to produce a clean, balanced cup with sweet caramel undertones and a bright citrus finish.", roast: "Medium Roast", price: 16.99, weight: "16 oz", stock: 62, active: true, badge: "Premium", badgeColor: "#C4A46D", imageKey: null },
  { id: 3, name: "Guatemalan Antigua", origin: "Guatemala", region: "Antigua Valley", altitude: "1,500 - 1,700m", tastingNotes: "Chocolate · Spice · Smoke", bio: "Volcanic soil and cool mountain air give Antigua beans their signature complexity. Full-bodied with a smoky-chocolate depth and subtle spice, this is a cup that rewards slow sipping.", roast: "Medium-Dark", price: 17.99, weight: "16 oz", stock: 38, active: true, badge: "New", badgeColor: "#22c55e", imageKey: null },
  { id: 4, name: "Sumatra Mandheling", origin: "Indonesia", region: "North Sumatra", altitude: "1,100 - 1,600m", tastingNotes: "Earth · Cedar · Dark Cocoa", bio: "Wet-hulled in the traditional Giling Basah method, Mandheling beans develop an earthy intensity with herbal undertones. Low acidity and heavy body make this a dark-roast lover's dream.", roast: "Dark Roast", price: 17.99, weight: "16 oz", stock: 29, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 5, name: "Costa Rica Tarrazú", origin: "Costa Rica", region: "Tarrazú Valley", altitude: "1,200 - 1,900m", tastingNotes: "Honey · Peach · Brown Sugar", bio: "The Tarrazú region's ideal climate produces exceptionally sweet, well-balanced beans. Honey-processed for a syrupy body and stone-fruit brightness that lingers on the palate.", roast: "Medium Roast", price: 18.99, weight: "16 oz", stock: 51, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 6, name: "Kenya AA", origin: "Kenya", region: "Central Highlands", altitude: "1,700 - 2,100m", tastingNotes: "Blackcurrant · Grapefruit · Toffee", bio: "Kenya AA is the top grade — large, dense beans bursting with juicy complexity. Bright grapefruit acidity pairs with blackcurrant sweetness and a toffee finish. Unmistakably bold.", roast: "Light Roast", price: 19.99, weight: "16 oz", stock: 18, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 7, name: "House Blend", origin: "Multi-Origin", region: "Brazil, Colombia, Ethiopia", altitude: "Various", tastingNotes: "Nutty · Smooth · Balanced", bio: "Our signature blend marries the best of three origins — Brazilian smoothness, Colombian sweetness, and Ethiopian complexity. The perfect everyday cup, consistent batch after batch.", roast: "Medium Roast", price: 14.99, weight: "16 oz", stock: 87, active: true, badge: "Blend", badgeColor: "#C4A46D", imageKey: null },
  { id: 8, name: "Brazilian Santos", origin: "Brazil", region: "São Paulo, Minas Gerais", altitude: "800 - 1,200m", tastingNotes: "Chocolate · Peanut · Low Acid", bio: "Natural-processed Santos beans from southeastern Brazil deliver a smooth, nutty cup with chocolate overtones. Gentle acidity makes this approachable and universally loved.", roast: "Medium-Dark", price: 15.99, weight: "16 oz", stock: 44, active: true, badge: null, badgeColor: null, imageKey: null },
];

const COLUMNS = `id, name, origin, region, altitude, tasting_notes, bio, roast,
                 price, weight, stock, active, badge, badge_color, image_key,
                 category, sort_order`;

// The storefront and admin bundles speak camelCase; the table speaks snake_case.
function toProduct(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    origin: row.origin || "",
    region: row.region || "",
    altitude: row.altitude || "",
    tastingNotes: row.tasting_notes || "",
    bio: row.bio || "",
    roast: row.roast || "",
    // NUMERIC comes back as a string from pg; the storefront does arithmetic on
    // this, so a string here would silently turn "16.99" + 2 into "16.992".
    price: Number(row.price),
    weight: row.weight || "",
    stock: row.stock,
    active: row.active,
    badge: row.badge,
    badgeColor: row.badge_color,
    imageKey: row.image_key,
    category: row.category || "coffee",
    sortOrder: row.sort_order,
  };
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

async function seedIfEmpty() {
  const existing = await db.one("SELECT count(*)::int AS n FROM products");
  if (existing && existing.n > 0) return;
  // ON CONFLICT DO NOTHING so two cold lambdas seeding at the same moment
  // cannot fail each other or double-insert.
  for (const [i, p] of DEFAULT_PRODUCTS.entries()) {
    await db.query(
      `INSERT INTO products (id, name, origin, region, altitude, tasting_notes, bio,
                             roast, price, weight, stock, active, badge, badge_color,
                             image_key, category, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.origin, p.region, p.altitude, p.tastingNotes, p.bio, p.roast,
       p.price, p.weight, p.stock, p.active, p.badge, p.badgeColor, p.imageKey,
       p.category || "coffee", i]
    );
  }
}

async function getProducts() {
  await seedIfEmpty();
  const rows = await db.query(`SELECT ${COLUMNS} FROM products ORDER BY sort_order, id`);
  return rows.map(toProduct);
}

async function getProductByName(name) {
  const key = normalizeName(name);
  if (!key) return null;
  const row = await db.one(`SELECT ${COLUMNS} FROM products WHERE lower(name) = $1`, [key]);
  return toProduct(row);
}

// The admin sends the whole catalog. Replace it in ONE transaction: products
// the admin removed are deleted, the rest are upserted. Without the transaction
// a mid-save failure would leave the storefront showing a half-updated catalog.
async function saveProducts(products) {
  const list = Array.isArray(products) ? products : [];
  const client = await db.connection().pool.connect();
  try {
    await client.query("BEGIN");
    const ids = list.map((p) => p.id);
    await client.query(
      ids.length ? "DELETE FROM products WHERE NOT (id = ANY($1::bigint[]))" : "DELETE FROM products",
      ids.length ? [ids] : []
    );
    for (const [i, p] of list.entries()) {
      await client.query(
        `INSERT INTO products (id, name, origin, region, altitude, tasting_notes, bio,
                               roast, price, weight, stock, active, badge, badge_color,
                               image_key, category, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, origin = EXCLUDED.origin, region = EXCLUDED.region,
           altitude = EXCLUDED.altitude, tasting_notes = EXCLUDED.tasting_notes,
           bio = EXCLUDED.bio, roast = EXCLUDED.roast, price = EXCLUDED.price,
           weight = EXCLUDED.weight, stock = EXCLUDED.stock, active = EXCLUDED.active,
           badge = EXCLUDED.badge, badge_color = EXCLUDED.badge_color,
           image_key = EXCLUDED.image_key, category = EXCLUDED.category,
           sort_order = EXCLUDED.sort_order, updated_at = now()`,
        [p.id, p.name, p.origin || "", p.region || "", p.altitude || "",
         p.tastingNotes || "", p.bio || "", p.roast || "", p.price, p.weight || "",
         p.stock, p.active !== false, p.badge ?? null, p.badgeColor ?? null,
         p.imageKey ?? null, p.category || "coffee",
         typeof p.sortOrder === "number" ? p.sortOrder : i]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// items: [{ name, quantity }]. One UPDATE per item, computed in the database,
// so simultaneous checkouts each see the other's decrement. GREATEST(0, ...)
// keeps us inside the stock >= 0 constraint if a race ever oversells.
async function decrementStock(items) {
  for (const item of items || []) {
    const key = normalizeName(item.name);
    const qty = Number(item.quantity || 0);
    if (!key || !(qty > 0)) continue;
    await db.query(
      `UPDATE products SET stock = GREATEST(0, stock - $2), updated_at = now()
       WHERE lower(name) = $1`,
      [key, qty]
    );
  }
  return getProducts();
}

module.exports = {
  getProducts, saveProducts, getProductByName, decrementStock,
  toProduct, normalizeName, DEFAULT_PRODUCTS,
};
