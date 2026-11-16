CREATE TABLE IF NOT EXISTS store_branches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  opening_hours TEXT,
  UNIQUE (store_id, name)
);