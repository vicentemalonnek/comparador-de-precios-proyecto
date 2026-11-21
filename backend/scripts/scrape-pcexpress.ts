import { getDb } from "../src/db/client.ts";
import { PcExpressScraper } from "../src/scrapers/pcexpress.scraper.ts";
import { saveScrapedProducts } from "../src/services/price.service.ts";

const scraper = new PcExpressScraper();
console.log(`Scraping ${scraper.storeName}...`);

const items = await scraper.scrape();
console.table(
  items.map((i) => ({
    id: i.externalId,
    category: i.category,
    name: i.name.slice(0, 40),
    price: i.price,
    mpn: i.mpn,
    inStock: i.inStock,
  })),
);

const saved = await saveScrapedProducts(
  getDb(),
  { name: scraper.storeName, websiteUrl: "https://tienda.pc-express.cl" },
  items,
);
console.log(`Saved ${saved} price records.`);