CREATE TABLE IF NOT EXISTS measurement_outbox (
 id text PRIMARY KEY,
 platform text NOT NULL,
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS measurement_outbox_pending ON measurement_outbox(available_at) WHERE status IN ('pending','sending');
