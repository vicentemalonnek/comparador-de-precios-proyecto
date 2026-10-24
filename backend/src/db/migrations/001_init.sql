-- Initial schema for the PC Price Comparator (SQLite)

CREATE TABLE IF NOT EXISTS stores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL UNIQUE,
  website_url  TEXT NOT NULL,
  address      TEXT,
  latitude     REAL,
  longitude    REAL,
  opening_hours TEXT,               -- JSON string, e.g. {"mon":"10:00-19:00"}
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('gpu', 'ram', 'ssd')),
  brand      TEXT,
  model      TEXT,
  specs      TEXT,                  -- JSON string with category-specific specs
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A product as listed by a specific store (the page the scraper visits)
CREATE TABLE IF NOT EXISTS listings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  UNIQUE (product_id, store_id)
);

-- One row per scrape: this is what makes the price history possible
CREATE TABLE IF NOT EXISTS prices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price      INTEGER NOT NULL,      -- CLP has no decimals
  currency   TEXT NOT NULL DEFAULT 'CLP',
  scraped_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  in_stock   INTEGER NOT NULL CHECK (in_stock IN (0, 1)),
  quantity   INTEGER,               -- NULL when the store does not show it
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prices_listing_date ON prices (listing_id, scraped_at);
CREATE INDEX IF NOT EXISTS idx_stock_listing_date  ON stock (listing_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products (category);