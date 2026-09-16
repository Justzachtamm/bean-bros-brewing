-- Correct Lucky Star food and drink uses; preserve price, stock and status.
UPDATE products
SET bio = E'Lucky Star brings warm, sweet, licorice-like flavor to coffee, tea, cooking and baking. Net wt. 1 oz (28 g). Ingredients: Star anise.\n\nWAYS TO USE\nCoffee + lattes: Infuse in warm milk for spiced coffee or a latte. Remove pods before adding the milk to coffee. Tea + chai: Add to chai or spiced tea recipes; strain out whole pods before drinking. Cooking: Simmer in broths or sauces; remove before serving. Baking + spice blends: Use finely ground star anise as your recipe directs. Use the amount specified in your recipe.\n\nKeep sealed in a cool, dry place away from sunlight.',
    tasting_notes = 'Warm · Sweet · Licorice-like',
    updated_at = NOW()
WHERE id = 900036 AND name = 'Lucky Star';
