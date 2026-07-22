const { getStore } = require("@netlify/blobs");

const STORE_NAME = "products";
const KEY = "catalog";

// Canonical seed data, merged from the site's original hardcoded storefront
// and admin arrays. Full bios come from the storefront copy (they were complete
// there; the admin copy had them truncated with "...").
const DEFAULT_PRODUCTS = [
  { id: 1, name: "Ethiopian Yirgacheffe", origin: "Ethiopia", region: "Yirgacheffe, Sidamo", altitude: "1,750 - 2,200m", tastingNotes: "Blueberry · Jasmine · Honey", bio: "Grown in the birthplace of coffee, this Yirgacheffe showcases bright, wine-like acidity with delicate floral notes. Sun-dried on raised beds, each bean carries the terroir of ancient Ethiopian soil.", roast: "Light Roast", price: 18.99, weight: "12 oz", stock: 45, active: true, badge: "Popular", badgeColor: "#3b82f6", imageKey: null },
  { id: 2, name: "Colombian Supremo", origin: "Colombia", region: "Huila, Nariño", altitude: "1,500 - 2,000m", tastingNotes: "Caramel · Walnut · Citrus", bio: "From the misty highlands of Huila, these supremo-grade beans are washed and sun-dried to produce a clean, balanced cup with sweet caramel undertones and a bright citrus finish.", roast: "Medium Roast", price: 16.99, weight: "12 oz", stock: 62, active: true, badge: "Premium", badgeColor: "#C4A46D", imageKey: null },
  { id: 3, name: "Guatemalan Antigua", origin: "Guatemala", region: "Antigua Valley", altitude: "1,500 - 1,700m", tastingNotes: "Chocolate · Spice · Smoke", bio: "Volcanic soil and cool mountain air give Antigua beans their signature complexity. Full-bodied with a smoky-chocolate depth and subtle spice, this is a cup that rewards slow sipping.", roast: "Medium-Dark", price: 17.99, weight: "12 oz", stock: 38, active: true, badge: "New", badgeColor: "#22c55e", imageKey: null },
  { id: 4, name: "Sumatra Mandheling", origin: "Indonesia", region: "North Sumatra", altitude: "1,100 - 1,600m", tastingNotes: "Earth · Cedar · Dark Cocoa", bio: "Wet-hulled in the traditional Giling Basah method, Mandheling beans develop an earthy intensity with herbal undertones. Low acidity and heavy body make this a dark-roast lover's dream.", roast: "Dark Roast", price: 17.99, weight: "12 oz", stock: 29, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 5, name: "Costa Rica Tarrazú", origin: "Costa Rica", region: "Tarrazú Valley", altitude: "1,200 - 1,900m", tastingNotes: "Honey · Peach · Brown Sugar", bio: "The Tarrazú region's ideal climate produces exceptionally sweet, well-balanced beans. Honey-processed for a syrupy body and stone-fruit brightness that lingers on the palate.", roast: "Medium Roast", price: 18.99, weight: "12 oz", stock: 51, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 6, name: "Kenya AA", origin: "Kenya", region: "Central Highlands", altitude: "1,700 - 2,100m", tastingNotes: "Blackcurrant · Grapefruit · Toffee", bio: "Kenya AA is the top grade — large, dense beans bursting with juicy complexity. Bright grapefruit acidity pairs with blackcurrant sweetness and a toffee finish. Unmistakably bold.", roast: "Light Roast", price: 19.99, weight: "12 oz", stock: 18, active: true, badge: null, badgeColor: null, imageKey: null },
  { id: 7, name: "House Blend", origin: "Multi-Origin", region: "Brazil, Colombia, Ethiopia", altitude: "Various", tastingNotes: "Nutty · Smooth · Balanced", bio: "Our signature blend marries the best of three origins — Brazilian smoothness, Colombian sweetness, and Ethiopian complexity. The perfect everyday cup, consistent batch after batch.", roast: "Medium Roast", price: 14.99, weight: "12 oz", stock: 87, active: true, badge: "Blend", badgeColor: "#C4A46D", imageKey: null },
  { id: 8, name: "Brazilian Santos", origin: "Brazil", region: "São Paulo, Minas Gerais", altitude: "800 - 1,200m", tastingNotes: "Chocolate · Peanut · Low Acid", bio: "Natural-processed Santos beans from southeastern Brazil deliver a smooth, nutty cup with chocolate overtones. Gentle acidity makes this approachable and universally loved.", roast: "Medium-Dark", price: 15.99, weight: "12 oz", stock: 44, active: true, badge: null, badgeColor: null, imageKey: null },
];

function store() {
  return getStore(STORE_NAME);
}

async function getProducts() {
  const s = store();
  const data = await s.get(KEY, { type: "json" });
  if (!data) {
    await s.setJSON(KEY, DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
  }
  return data;
}

async function saveProducts(products) {
  await store().setJSON(KEY, products);
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

async function getProductByName(name) {
  const products = await getProducts();
  const key = normalizeName(name);
  return products.find((p) => normalizeName(p.name) === key) || null;
}

// items: [{ name, quantity }] — decrements stock for each matched product.
// Returns the updated product list.
async function decrementStock(items) {
  const products = await getProducts();
  let changed = false;
  for (const item of items) {
    const key = normalizeName(item.name);
    const p = products.find((p) => normalizeName(p.name) === key);
    if (p) {
      p.stock = Math.max(0, (p.stock || 0) - (item.quantity || 0));
      changed = true;
    }
  }
  if (changed) await saveProducts(products);
  return products;
}

module.exports = { getProducts, saveProducts, getProductByName, decrementStock, DEFAULT_PRODUCTS };
