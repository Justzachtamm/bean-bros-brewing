-- Customer accounts move off Netlify Blobs and into Postgres.
--
-- Why: Blobs reads are eventually consistent (measured up to ~11s in production
-- on this site), and `connectLambda` cannot opt into strong consistency. For a
-- catalog that is harmless; for auth it meant "invalid password" moments after
-- signup. Postgres gives read-after-write, and UNIQUE + ON CONFLICT give an
-- atomic duplicate check instead of a racy read-then-write.

CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT        PRIMARY KEY,
  -- Case-insensitivity is enforced here rather than trusted from the caller,
  -- so a stray capital can never create a second account for one person.
  email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email) AND email <> ''),
  name          TEXT        NOT NULL DEFAULT '',
  password_hash TEXT        NOT NULL,
  address       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login throttling. One row per email; the counter window resets in SQL so two
-- simultaneous failed logins cannot lose an increment.
CREATE TABLE IF NOT EXISTS account_login_attempts (
  email      TEXT        PRIMARY KEY,
  fail_count INTEGER     NOT NULL DEFAULT 0,
  window_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
