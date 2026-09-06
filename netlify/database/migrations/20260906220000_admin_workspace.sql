CREATE TABLE IF NOT EXISTS admin_workspace_records (
 id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('note','task')), customer_email text NOT NULL DEFAULT '',
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
