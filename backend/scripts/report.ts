// Summary of what is in the database: deno task report
import { getDb } from "../src/db/client.ts";
import { listComparisons } from "../src/services/product.service.ts";

const db = getDb();

const { rows: perStore } = await db.execute(
  `SELECT s.name AS store, COUNT(DISTINCT l.id) AS listings,
          COUNT(pr.id) AS prices, MAX(pr.scraped_at) AS lastScrape
   FROM stores s
   JOIN listings l ON l.store_id = s.id
   LEFT JOIN prices pr ON pr.listing_id = l.id
   GROUP BY s.name
   ORDER BY s.name`,
);
console.log("Products and prices per store");
console.table(perStore);

const { rows: days } = await db.execute(
  "SELECT COUNT(DISTINCT date(scraped_at)) AS days FROM prices",
);
console.log(`Days with price data: ${days[0].days}\n`);

console.log("Comparisons (same product in several stores)");
const summary = [];
for (const category of ["cpu", "ram", "ssd"]) {
  const comparisons = await listComparisons(category);
  const byStores = (n: number) =>
    comparisons.filter((c) => c.offers.length === n).length;
  summary.push({
    category,
    products: comparisons.length,
    "in 2 stores": byStores(2),
    "in 3 stores": byStores(3),
  });
}
console.table(summary);

// A few examples found in all three stores, cheapest first
const all = (await listComparisons(null)).filter((c) => c.offers.length >= 3);
for (const c of all.slice(0, 5)) {
  const offers = c.offers.map((o) => `${o.store} $${o.price}`).join(" | ");
  console.log(`${c.name.slice(0, 50)}\n   ${offers}`);
}
