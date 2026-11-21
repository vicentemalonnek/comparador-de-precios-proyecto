import { PoliteFetcher } from "./http.ts";
import type {
  ProductCategory,
  ScrapedProduct,
  Scraper,
} from "./base.scraper.ts";

// robots.txt only blocks a list of named bots (mostly AI crawlers) and sets no
// Crawl-delay; 3 seconds is a polite pause. See docs/DATA_SOURCES.md.
const DELAY_MS = 3000;
const PRODUCT_LIST = new URL(
  "./lists/inforingen-products.json",
  import.meta.url,
);
// Public WooCommerce Store API: the same JSON the store's own cart uses
const STORE_API = "https://store.infor-ingen.com/wp-json/wc/store/v1/products";

type ProductList = Partial<Record<ProductCategory, string[]>>;

// Only the fields we use from the Store API response
export interface StoreApiProduct {
  id: number;
  name: string;
  sku?: string;
  permalink?: string;
  is_in_stock?: boolean;
  prices?: {
    price?: string; // current price (with the store's discount)
    regular_price?: string; // normal price
    currency_minor_unit?: number; // decimals: 0 for CLP
  };
  brands?: { name?: string }[];
}

// The API escapes some characters as HTML entities (for example &#8211;)
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .trim();
}

export function toScrapedProduct(
  product: StoreApiProduct,
  category: ProductCategory,
  url: string,
): ScrapedProduct | null {
  const divisor = 10 ** (product.prices?.currency_minor_unit ?? 0);
  const current = Number(product.prices?.price) / divisor;
  const regular = Number(product.prices?.regular_price) / divisor;
  if (!product.name || !Number.isFinite(current) || current <= 0) return null;

  // Like PC Factory: "price" is the normal price and "cashPrice" the lower one
  const normal = Number.isFinite(regular) && regular > current
    ? regular
    : current;
  return {
    externalId: String(product.id),
    name: decodeEntities(product.name),
    url: product.permalink ?? url,
    category,
    price: Math.round(normal),
    cashPrice: normal > current ? Math.round(current) : null,
    inStock: product.is_in_stock ?? null,
    brand: product.brands?.[0]?.name ?? null,
    mpn: product.sku || null,
  };
}

export class InforIngenScraper implements Scraper {
  readonly storeName = "Infor-Ingen";
  private readonly fetcher = new PoliteFetcher(DELAY_MS);

  async scrape(): Promise<ScrapedProduct[]> {
    const list = JSON.parse(Deno.readTextFileSync(PRODUCT_LIST)) as ProductList;
    const entries = Object.entries(list).flatMap(([category, urls]) =>
      (urls ?? []).map((url) => ({
        category: category as ProductCategory,
        url,
      }))
    );
    console.log(`Found ${entries.length} products in the list.`);

    const results: ScrapedProduct[] = [];
    for (const [index, entry] of entries.entries()) {
      console.log(
        `[${index + 1}/${entries.length}] ${entry.category} ${entry.url}`,
      );
      const product = await this.scrapeProduct(entry.url, entry.category);
      if (product) results.push(product);
    }
    return results;
  }

  private async scrapeProduct(
    url: string,
    category: ProductCategory,
  ): Promise<ScrapedProduct | null> {
    // The list keeps the normal page URL; the API looks products up by slug
    // Some URLs keep special characters encoded (%e2%80%b3): decode them first
    const match = url.match(/\/producto\/([^/?#]+)/)?.[1];
    const slug = match ? decodeURIComponent(match) : null;
    if (!slug) {
      console.warn(`Skipped ${url}: not a product URL`);
      return null;
    }

    const response = await this.fetcher.get(
      `${STORE_API}?slug=${encodeURIComponent(slug)}`,
    );
    if (!response.ok) {
      console.warn(`Skipped ${url}: status ${response.status}`);
      return null;
    }

    const [product] = (await response.json()) as StoreApiProduct[];
    const scraped = product ? toScrapedProduct(product, category, url) : null;
    if (!scraped) console.warn(`Skipped ${url}: product data not found`);
    return scraped;
  }
}
