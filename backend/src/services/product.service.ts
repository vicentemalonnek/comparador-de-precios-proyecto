import { db } from "../db/client.ts";

export interface ProductSummary {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  store: string;
  url: string;
  price: number;
  cashPrice: number | null;
  scrapedAt: string;
}

// Latest price of every listing (each scraper run adds a new row to "prices")
const LATEST_PRICES_SQL = `
  SELECT p.id, p.name, p.category, p.brand, s.name AS store, l.url,
         pr.price, pr.cash_price AS cashPrice, pr.scraped_at AS scrapedAt
  FROM products p
  JOIN listings l ON l.product_id = p.id
  JOIN stores s ON s.id = l.store_id
  JOIN prices pr ON pr.id = (
    SELECT id FROM prices WHERE listing_id = l.id
    ORDER BY scraped_at DESC, id DESC LIMIT 1
  )
`;

export function listProducts(category: string | null): ProductSummary[] {
  const rows = category
    ? db.prepare(`${LATEST_PRICES_SQL} WHERE p.category = ? ORDER BY pr.price`)
      .all(category)
    : db.prepare(`${LATEST_PRICES_SQL} ORDER BY p.category, pr.price`).all();

  return rows as unknown as ProductSummary[];
}