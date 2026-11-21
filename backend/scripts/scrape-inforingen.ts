import { getDb } from "../src/db/client.ts";
import { InforIngenScraper } from "../src/scrapers/inforingen.scraper.ts";
import { saveScrapedProducts } from "../src/services/price.service.ts";

// Usage: deno task scrape:inforingen [--dry-run]
// --dry-run only prints what was found, without saving to the database
const dryRun = Deno.args.includes("--dry-run");

const scraper = new InforIngenScraper();
console.log(`Scraping ${scraper.storeName}...`);

const items = await scraper.scrape();
console.table(
  items.map((i) => ({
    id: i.externalId.slice(0, 30),
    category: i.category,
    name: i.name.slice(0, 40),
    price: i.price,
    mpn: i.mpn,
    inStock: i.inStock,
  })),
);

if (dryRun) {
  console.log(`Dry run: ${items.length} products found, nothing saved.`);
} else {
  const saved = await saveScrapedProducts(
    getDb(),
    { name: scraper.storeName, websiteUrl: "https://store.infor-ingen.com" },
    items,
  );
  console.log(`Saved ${saved} price records.`);
}
