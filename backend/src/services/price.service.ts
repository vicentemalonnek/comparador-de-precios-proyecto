import type { Statement, TursoClient } from "../db/client.ts";
import type { ScrapedProduct } from "../scrapers/base.scraper.ts";

interface StoreInfo {
  name: string;
  websiteUrl: string;
}

// The listing id is looked up inside the SQL, so new and existing listings are
// handled the same way within one transaction
const LISTING_ID =
  "(SELECT id FROM listings WHERE store_id = ? AND external_id = ?)";

export async function saveScrapedProducts(
  db: TursoClient,
  store: StoreInfo,
  items: ScrapedProduct[],
): Promise<number> {
  await db.execute(
    "INSERT OR IGNORE INTO stores (name, website_url) VALUES (?, ?)",
    [store.name, store.websiteUrl],
  );
  const { rows: storeRows } = await db.execute(
    "SELECT id FROM stores WHERE name = ?",
    [store.name],
  );
  const storeId = Number(storeRows[0].id);

  // Listings this store already has, so only the new products get created
  const { rows: listingRows } = await db.execute(
    "SELECT external_id FROM listings WHERE store_id = ?",
    [storeId],
  );
  const known = new Set(listingRows.map((row) => String(row.external_id)));

  const statements: Statement[] = [];
  for (const item of items) {
    // First time we see this product in this store: create it
    if (!known.has(item.externalId)) {
      known.add(item.externalId);
      statements.push(
        {
          sql:
            "INSERT INTO products (name, category, brand, mpn) VALUES (?, ?, ?, ?)",
          args: [item.name, item.category, item.brand, item.mpn],
        },
        {
          // last_insert_rowid() is the product inserted just before, on the same connection
          sql: `INSERT INTO listings (product_id, store_id, external_id, url)
                VALUES (last_insert_rowid(), ?, ?, ?)`,
          args: [storeId, item.externalId, item.url],
        },
      );
    }

    // Every run adds a new row, which is what builds the price history
    statements.push({
      sql:
        `INSERT INTO prices (listing_id, price, cash_price) VALUES (${LISTING_ID}, ?, ?)`,
      args: [storeId, item.externalId, item.price, item.cashPrice],
    });
    if (item.inStock !== null) {
      statements.push({
        sql:
          `INSERT INTO stock (listing_id, in_stock) VALUES (${LISTING_ID}, ?)`,
        args: [storeId, item.externalId, item.inStock ? 1 : 0],
      });
    }
  }

  // One transaction: if anything fails, nothing from this run is saved
  await db.batch(statements);
  return items.length;
}
