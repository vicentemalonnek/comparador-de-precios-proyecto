import { db } from "../src/db/client.ts";
import { PcFactoryScraper } from "../src/scrapers/pcfactory.scraper.ts";
import { saveScrapedProducts } from "../src/services/price.service.ts";

// Usage: deno task scrape:pcfactory --limit=2
const limitArg = Deno.args.find((arg) => arg.startsWith("--limit="));
const limitPerCategory = limitArg ? Number(limitArg.split("=")[1]) : undefined;

const scraper = new PcFactoryScraper({ limitPerCategory });
console.log(`Scraping ${scraper.storeName}...`);

const items = await scraper.scrape();
console.table(
  items.map((i) => ({
    id: i.externalId,
    category: i.category,
    name: i.name.slice(0, 40),
    price: i.price,
    cash: i.cashPrice,
  })),
);

const saved = saveScrapedProducts(
  db,
  { name: scraper.storeName, websiteUrl: "https://www.pcfactory.cl" },
  items,
);
console.log(`Saved ${saved} price records.`);