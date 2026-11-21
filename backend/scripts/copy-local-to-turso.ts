// One-time copy of the old local SQLite file (data/app.db) into Turso, keeping
// the ids so the price history stays linked: deno task db:copy-local
// Rows that already exist are skipped, so it can be run again safely.
import { DatabaseSync } from "node:sqlite";
import { getDb, type SqlValue } from "../src/db/client.ts";

// Parents before children, so foreign keys always point to existing rows.
// Sessions are not copied: users just log in again.
const TABLES = [
  "stores",
  "products",
  "listings",
  "prices",
  "stock",
  "users",
  "store_branches",
];
const ROWS_PER_BATCH = 200;

const local = new DatabaseSync(
  Deno.env.get("DATABASE_PATH") ?? "./data/app.db",
  {
    readOnly: true,
  },
);
const db = getDb();

for (const table of TABLES) {
  const rows = local.prepare(`SELECT * FROM ${table}`).all() as Record<
    string,
    SqlValue
  >[];
  if (rows.length === 0) {
    console.log(`${table}: empty`);
    continue;
  }

  const columns = Object.keys(rows[0]);
  const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(", ")})
               VALUES (${columns.map(() => "?").join(", ")})`;

  for (let i = 0; i < rows.length; i += ROWS_PER_BATCH) {
    const chunk = rows.slice(i, i + ROWS_PER_BATCH);
    await db.batch(
      chunk.map((row) => ({ sql, args: columns.map((col) => row[col]) })),
    );
  }
  console.log(`${table}: ${rows.length} rows`);
}

local.close();
