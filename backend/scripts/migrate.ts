// Creates the tables in the Turso database: deno task migrate
// The SQL files use "IF NOT EXISTS", so running this again is safe.
import { getDb } from "../src/db/client.ts";

const MIGRATIONS_DIR = new URL("../src/db/migrations/", import.meta.url);

const files = [...Deno.readDirSync(MIGRATIONS_DIR)]
  .filter((entry) => entry.isFile && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

for (const file of files) {
  const sql = Deno.readTextFileSync(new URL(file, MIGRATIONS_DIR));
  await getDb().executeScript(sql);
  console.log(`Applied ${file}`);
}
