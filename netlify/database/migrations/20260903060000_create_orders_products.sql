-- Orders, order idempotency, and the product catalog move off Netlify Blobs.
--
-- Why (same reason accounts moved, plus a worse failure mode):
--
-- 1. LOST ORDERS. The Blobs version stored every order in ONE json array under
--    a single key and did read-modify-write. Two webhooks arriving together
--    both read the array, both appended, and the second write clobbered the
--    first — a paid order silently vanished. One row per order removes the
--    shared mutable value entirely.
--
-- 2. NON-ATOMIC IDEMPOTENCY. Dedupe was `orders.some(o => o.sessionId === ...)`
--    read from an eventually-consistent store. Stripe retries webhooks, so a
--    redelivery that read a stale array recorded the order twice. UNIQUE on
--    session_id makes the check atomic in the database.
--
-- 3. DOUBLE-DECREMENTED STOCK. decrementStock() ran BEFORE the dedupe check,
--    so even a correctly-deduped webhook retry still took stock a second time.
--    Stock now decrements only when the order INSERT actually creates a row,
--    and does so as a single UPDATE rather than read-modify-write.

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER     PRIMARY KEY,
  name          TEXT        NOT NULL CHECK (name <> ''),
  origin        TEXT        NOT NULL DEFAULT '',
  region        TEXT        NOT NULL DEFAULT '',
  altitude      TEXT        NOT NULL DEFAULT '',
  tasting_notes TEXT        NOT NULL DEFAULT '',
  bio           TEXT        NOT NULL DEFAULT '',
  roast         TEXT        NOT NULL DEFAULT '',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  weight        TEXT        NOT NULL DEFAULT '',
  -- CHECK (stock >= 0) is the real guard against overselling. The old code
  -- clamped with Math.max(0, ...) in JS, which cannot hold under concurrency.
  stock         INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  badge         TEXT,
  badge_color   TEXT,
  image_key     TEXT,
  -- Storefront sections. 'coffee' today; 'accessories' and 'herbs' are what the
  -- mugs/merch and teas tabs will use, so the column exists before that work
  -- rather than needing another migration against a live table.
  category      TEXT        NOT NULL DEFAULT 'coffee',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checkout looks products up by name (case-insensitively). Enforcing uniqueness
-- on lower(name) means that lookup can never match two rows, and the admin
-- cannot save two products whose names differ only by capitalisation.
CREATE UNIQUE INDEX IF NOT EXISTS products_name_lower_idx ON products (lower(name));
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category, sort_order, id);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT        PRIMARY KEY,
  -- The Stripe checkout-session id or invoice id. UNIQUE is the idempotency
  -- key: a webhook redelivery hits ON CONFLICT DO NOTHING and changes nothing.
  session_id       TEXT        NOT NULL UNIQUE,
  customer_id      TEXT        NOT NULL DEFAULT '',
  customer_name    TEXT        NOT NULL DEFAULT '',
  customer_email   TEXT        NOT NULL DEFAULT '',
  items            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'Paid',
  shipping_address JSONB,
  tracking_number  TEXT,
  label_key        TEXT,
  shipment_id      TEXT,
  -- Anything the label/void flows patch onto an order that is not a column of
  -- its own (e.g. labelCreationStartedAt) lands here, so those endpoints keep
  -- working without a schema change per field.
  extra            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ordered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "my orders" filters on lower(email) and sorts newest-first; the admin
-- dashboard sorts newest-first across everyone. One index each.
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (lower(customer_email), ordered_at DESC);
CREATE INDEX IF NOT EXISTS orders_ordered_at_idx ON orders (ordered_at DESC);

-- Sample table created by the Netlify DB extension's getting-started flow.
-- Never used by this site.
DROP TABLE IF EXISTS planets;
