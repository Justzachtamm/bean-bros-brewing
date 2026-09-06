CREATE TABLE IF NOT EXISTS business_records (
  kind text NOT NULL CHECK (kind IN ('contact','expense','filing','refund','tax_profile')),
  id text NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind,id)
);
