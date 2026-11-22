-- Comanda — esquema Postgres (Vercel Postgres, Neon o Supabase).
-- Aplica con: psql "$POSTGRES_URL" -f scripts/seed.sql
-- o desde el panel SQL de tu proveedor. Luego la app usa estas tablas en
-- lugar del store en memoria. Los PINs van hasheados (SHA-256 + sal), nunca en claro.
CREATE TABLE IF NOT EXISTS restaurants (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY, restaurant_slug TEXT REFERENCES restaurants(slug),
  name TEXT NOT NULL, description TEXT DEFAULT '', category TEXT NOT NULL,
  price_cents INT NOT NULL, kitchen TEXT NOT NULL DEFAULT 'cocina-a',
  tiempo TEXT, is_available BOOLEAN DEFAULT true
);
CREATE TABLE IF NOT EXISTS daily_menus (
  id SERIAL PRIMARY KEY, restaurant_slug TEXT REFERENCES restaurants(slug),
  date DATE NOT NULL, sencillo_price_cents INT, special_dish TEXT,
  special_price_cents INT, notes TEXT DEFAULT '', is_published BOOLEAN DEFAULT false,
  is_example BOOLEAN DEFAULT false, UNIQUE (restaurant_slug, date)
);
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY, restaurant_slug TEXT REFERENCES restaurants(slug),
  label TEXT NOT NULL, zone TEXT NOT NULL DEFAULT 'restaurante-1', active BOOLEAN DEFAULT true
);
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), restaurant_slug TEXT REFERENCES restaurants(slug),
  table_id INT REFERENCES tables(id), status TEXT DEFAULT 'abierta',
  payment_method TEXT, cash_cents INT, created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);
-- Columnas que la app añade sola con IF NOT EXISTS (ensureColumns):
-- change_ready, kitchen_alert, closed_by_mesero, cut_date.
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID REFERENCES accounts(id),
  menu_item_id INT, name TEXT NOT NULL, price_cents INT NOT NULL, qty INT DEFAULT 1,
  kitchen TEXT NOT NULL, tiempo TEXT, status TEXT DEFAULT 'pendiente',
  corrida INT, notes TEXT, detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff_pins (
  restaurant_slug TEXT REFERENCES restaurants(slug), role TEXT NOT NULL,
  pin_hash TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (restaurant_slug, role)
);
CREATE TABLE IF NOT EXISTS settings (
  restaurant_slug TEXT PRIMARY KEY REFERENCES restaurants(slug),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);
-- Llamadas de asistencia al mesero (botón circular del comensal en /dzib):
-- una fila por llamada, pendiente hasta que el mesero la marca atendida.
CREATE TABLE IF NOT EXISTS assistance_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_slug TEXT NOT NULL,
  table_id INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO restaurants (slug, name, address) VALUES
  ('dzib', 'Dzib', 'Regina 54, Centro Histórico, CDMX'),
  ('tacos-la-chula', 'Tacos La Chula', 'CDMX — 8 sucursales')
ON CONFLICT (slug) DO NOTHING;
-- Las 12 mesas de Dzib (6 + 6, dos restaurantes en el mismo edificio):
INSERT INTO tables (restaurant_slug, label, zone) VALUES
  ('dzib','Mesa 1','restaurante-1'),('dzib','Mesa 2','restaurante-1'),
  ('dzib','Mesa 3','restaurante-1'),('dzib','Mesa 4','restaurante-1'),
  ('dzib','Mesa 5','restaurante-1'),('dzib','Mesa 6','restaurante-1'),
  ('dzib','Mesa 1B','restaurante-2'),('dzib','Mesa 2B','restaurante-2'),
  ('dzib','Mesa 3B','restaurante-2'),('dzib','Mesa 4B','restaurante-2'),
  ('dzib','Mesa 5B','restaurante-2'),('dzib','Mesa 6B','restaurante-2')
ON CONFLICT DO NOTHING;
