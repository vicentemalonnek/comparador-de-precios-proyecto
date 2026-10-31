import type { DatabaseSync } from "node:sqlite";
import type { ScrapedProduct } from "../scrapers/base.scraper.ts";

interface StoreInfo {
  name: string;
  websiteUrl: string;
}

export function saveScrapedProducts(
  db: DatabaseSync,
  store: StoreInfo,
  items: ScrapedProduct[],
): number {
  db.prepare("INSERT OR IGNORE INTO stores (name, website_url) VALUES (?, ?)")
    .run(store.name, store.websiteUrl);
  const storeRow = db.prepare("SELECT id FROM stores WHERE name = ?")
    .get(store.name) as unknown as { id: number };

  const findListing = db.prepare(
    "SELECT id FROM listings WHERE store_id = ? AND external_id = ?",
  );
  const insertProduct = db.prepare(
    "INSERT INTO products (name, category, brand, mpn) VALUES (?, ?, ?, ?)",
  );
  const insertListing = db.prepare(
    "INSERT INTO listings (product_id, store_id, external_id, url) VALUES (?, ?, ?, ?)",
  );
  const insertPrice = db.prepare(
    "INSERT INTO prices (listing_id, price, cash_price) VALUES (?, ?, ?)",
  );
  const insertStock = db.prepare(
    "INSERT INTO stock (listing_id, in_stock) VALUES (?, ?)",
  );

  db.exec("BEGIN");
  try {
    for (const item of items) {
      let listing = findListing.get(storeRow.id, item.externalId) as unknown as
        | { id: number }
        | undefined;

      // First time we see this product in this store: create it
      if (!listing) {
        const product = insertProduct.run(
          item.name,
          item.category,
          item.brand,
          item.mpn,
        );
        const created = insertListing.run(
          Number(product.lastInsertRowid),
          storeRow.id,
          item.externalId,
          item.url,
        );
        listing = { id: Number(created.lastInsertRowid) };
      }

      // Every run adds a new row, which is what builds the price history
      insertPrice.run(listing.id, item.price, item.cashPrice);
      if (item.inStock !== null) {
        insertStock.run(listing.id, item.inStock ? 1 : 0);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return items.length;
}