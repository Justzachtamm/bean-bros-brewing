-- Starter migration scaffolded by "netlify database init".
CREATE TABLE IF NOT EXISTS planets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mass_kg DOUBLE PRECISION NOT NULL,
  temperature_celsius INTEGER NOT NULL
);

INSERT INTO planets (name, mass_kg, temperature_celsius) VALUES
  ('Mercury', 3.30e23, 167),
  ('Venus', 4.87e24, 464),
  ('Earth', 5.97e24, 15),
  ('Mars', 6.42e23, -65),
  ('Jupiter', 1.898e27, -110),
  ('Saturn', 5.68e26, -140),
  ('Uranus', 8.68e25, -195),
  ('Neptune', 1.02e26, -200);
