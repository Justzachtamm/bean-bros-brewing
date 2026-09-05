-- Existing accounts must prove email ownership; do not backfill verification.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_hash TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verification_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Millisecond IDs emitted by the existing catalog editor need a wider column.
ALTER TABLE products ALTER COLUMN id TYPE BIGINT;
