-- Correct user-confirmed external-only use. Preserve price, stock and status.
UPDATE products
SET bio = E'FOR EXTERNAL USE ONLY. DO NOT INGEST. NOT FOR TEA OR COOKING.\n\nLucky Star contains star anise for dry decorative and aromatic use. Net wt. 1 oz (28 g).\n\nWAYS TO USE\nSachets: Place pods in a securely tied fabric pouch.\nPotpourri: Add to a dry botanical display in a closed, vented container, out of reach.\nCrafts and decor: Secure pods to wreaths or decorative ornaments.\n\nKeep dry. Keep away from children and pets. Do not eat, brew, or add to food or drinks.',
    tasting_notes = 'FOR EXTERNAL USE ONLY · DO NOT INGEST',
    updated_at = now()
WHERE id = 900036 AND name = 'Lucky Star';
