import { db } from "../src/db/client.ts";

interface BranchSeed {
  store: string;
  websiteUrl: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  openingHours?: string | null;
}

const seeds = JSON.parse(
  Deno.readTextFileSync(new URL("../seed/branches.json", import.meta.url)),
) as BranchSeed[];

// Rough bounding box of the Santiago area; it also catches swapped values
function isInSantiago(latitude: number | null, longitude: number | null) {
  return (
    typeof latitude === "number" && typeof longitude === "number" &&
    latitude >= -34.2 && latitude <= -32.8 &&
    longitude >= -71.3 && longitude <= -69.9
  );
}

let saved = 0;
for (const seed of seeds) {
  if (!isInSantiago(seed.latitude, seed.longitude)) {
    console.warn(
      `Skipped "${seed.store} - ${seed.name}": coordinates missing or outside Santiago`,
    );
    continue;
  }

  db.prepare("INSERT OR IGNORE INTO stores (name, website_url) VALUES (?, ?)")
    .run(seed.store, seed.websiteUrl);
  const store = db.prepare("SELECT id FROM stores WHERE name = ?")
    .get(seed.store) as unknown as { id: number };

  db.prepare(
    `INSERT INTO store_branches (store_id, name, address, latitude, longitude, opening_hours)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(store_id, name) DO UPDATE SET
       address = excluded.address,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       opening_hours = excluded.opening_hours`,
  ).run(
    store.id,
    seed.name,
    seed.address,
    seed.latitude,
    seed.longitude,
    seed.openingHours ?? null,
  );
  saved++;
}

console.log(`Saved ${saved} of ${seeds.length} branches.`);