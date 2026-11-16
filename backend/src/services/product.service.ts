import { db } from "../db/client.ts";
import { groupOffers } from "./matching.service.ts";

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
  inStock: number | null; // 1, 0 or null when the store does not report it
}

// Latest price and latest known stock of every listing
const LATEST_PRICES_SQL = `
  SELECT p.id, p.name, p.category, p.brand, s.name AS store, l.url,
         pr.price, pr.cash_price AS cashPrice, pr.scraped_at AS scrapedAt,
         (SELECT in_stock FROM stock WHERE listing_id = l.id
          ORDER BY checked_at DESC, id DESC LIMIT 1) AS inStock
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

export interface ComparisonOffer {
  productId: number;
  store: string;
  url: string;
  price: number;
  cashPrice: number | null;
  inStock: boolean | null;
  scrapedAt: string;
}

export interface ProductComparison {
  key: string;
  name: string;
  category: string;
  brand: string | null;
  offers: ComparisonOffer[]; // cheapest first
}

export function listComparisons(category: string | null): ProductComparison[] {
  const comparisons = groupOffers(listProducts(category)).map((group) => {
    const offers = group
      .map((p): ComparisonOffer => ({
        productId: p.id,
        store: p.store,
        url: p.url,
        price: p.price,
        cashPrice: p.cashPrice,
        inStock: p.inStock === null ? null : p.inStock === 1,
        scrapedAt: p.scrapedAt,
      }))
      .sort((a, b) => a.price - b.price);

    // Prefer the PC Express name: it comes from structured data, not from a URL
    const main = group.find((p) => p.store === "PC Express") ?? group[0];
    return {
      key: `${main.category}-${main.id}`,
      name: main.name,
      category: main.category,
      brand: main.brand,
      offers,
    };
  });

  // Compared products first, then by category and price
  return comparisons.sort((a, b) =>
    b.offers.length - a.offers.length ||
    a.category.localeCompare(b.category) ||
    a.offers[0].price - b.offers[0].price
  );
}

export interface PricePoint {
  store: string;
  price: number;
  cashPrice: number | null;
  scrapedAt: string;
}

export function getPriceHistory(productId: number): PricePoint[] {
  const rows = db.prepare(
    `SELECT s.name AS store, pr.price, pr.cash_price AS cashPrice,
            pr.scraped_at AS scrapedAt
     FROM prices pr
     JOIN listings l ON l.id = pr.listing_id
     JOIN stores s ON s.id = l.store_id
     WHERE l.product_id = ?
     ORDER BY pr.scraped_at, pr.id`,
  ).all(productId);

  return rows as unknown as PricePoint[];
}