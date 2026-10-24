import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";

const DB_PATH = Deno.env.get("DATABASE_PATH") ?? "./data/app.db";
const MIGRATIONS_DIR = new URL("./migrations/", import.meta.url);

function runMigrations(database: DatabaseSync): void {
  const files = [...Deno.readDirSync(MIGRATIONS_DIR)]
    .filter((entry) => entry.isFile && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  for (const file of files) {
    const sql = Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR));
    database.exec(sql);
  }
}

export function openDatabase(): DatabaseSync {
  Deno.mkdirSync(dirname(DB_PATH), { recursive: true });

  const database = new DatabaseSync(DB_PATH);
  // SQLite ignores foreign keys unless this is enabled on every connection
  database.exec("PRAGMA foreign_keys = ON;");
  runMigrations(database);

  return database;
}

export const db = openDatabase();