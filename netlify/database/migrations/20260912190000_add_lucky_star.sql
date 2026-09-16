-- User-approved Lucky Star launch: 1 oz, $7, one initial unit.
-- Keep reruns from resetting stock or overwriting an existing product.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE id = 900036 AND name <> 'Lucky Star') THEN
    RAISE EXCEPTION 'Lucky Star product ID is already in use';
  END IF;
  IF EXISTS (SELECT 1 FROM products WHERE lower(name) = 'lucky star' AND id <> 900036) THEN
    RAISE EXCEPTION 'Lucky Star already exists under a different product ID';
  END IF;
END $$;

INSERT INTO products
  (id, name, price, stock, active, weight, category, tasting_notes, bio, sort_order)
VALUES
  (900036, 'Lucky Star', 7.00, 1, true, '1 oz (28 g)', 'herbs',
   'Warm · Sweet · Licorice-like',
   E'Lucky Star is star anise, a warm, sweet, aromatic spice with a distinctive licorice-like flavor. Use it in spice blends, broths, sauces, and baked goods.\n\nNet wt. 1 oz (28 g). Ingredients: Star anise.\n\nAdd to recipes to taste. Remove whole pods before serving. Follow supplier preparation guidance.\n\nPairs well with cinnamon, clove, ginger, and orange peel. Keep sealed in a cool, dry place away from direct sunlight.',
   1000)
ON CONFLICT (id) DO NOTHING;
