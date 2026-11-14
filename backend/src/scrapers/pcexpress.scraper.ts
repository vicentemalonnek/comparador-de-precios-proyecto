import { PoliteFetcher } from "./http.ts";
import type { ProductCategory, ScrapedProduct, Scraper } from "./base.scraper.ts";

// robots.txt sets no Crawl-delay; 3 seconds is a polite pause
const DELAY_MS = 3000;
const PRODUCT_LIST = new URL("./lists/pcexpress-products.json", import.meta.url);

type ProductList = Partial<Record<ProductCategory, string[]>>;

interface LdProduct {
  "@type"?: string;
  name?: string;
  mpn?: string;
  brand?: { name?: string };
  offers?: { price?: string | number; availability?: string };
}

export class PcExpressScraper implements Scraper {
  readonly storeName = "PC Express";
  private readonly fetcher = new PoliteFetcher(DELAY_MS);

  async scrape(): Promise<ScrapedProduct[]> {
    const list = JSON.parse(Deno.readTextFileSync(PRODUCT_LIST)) as ProductList;
    const entries = Object.entries(list).flatMap(([category, urls]) =>
      (urls ?? []).map((url) => ({ category: category as ProductCategory, url }))
    );
    console.log(`Found ${entries.length} products in the list.`);

    const results: ScrapedProduct[] = [];
    for (const [index, entry] of entries.entries()) {
      console.log(`[${index + 1}/${entries.length}] ${entry.category} ${entry.url}`);
      const product = await this.scrapeProduct(entry.url, entry.category);
      if (product) results.push(product);
    }
    return results;
  }

  private async scrapeProduct(
    url: string,
    category: ProductCategory,
  ): Promise<ScrapedProduct | null> {
    const response = await this.fetcher.get(url);
    if (!response.ok) {
      console.warn(`Skipped ${url}: status ${response.status}`);
      return null;
    }

    const ld = extractProductJsonLd(await response.text());
    const price = Number(ld?.offers?.price);
    const externalId = url.match(/tienda\.pc-express\.cl\/(\d+)-/)?.[1];

    if (!ld?.name || !Number.isFinite(price) || price <= 0 || !externalId) {
      console.warn(`Skipped ${url}: product data not found`);
      return null;
    }

    const availability = ld.offers?.availability;
    return {
      externalId,
      name: ld.name,
      url,
      category,
      price: Math.round(price),
      cashPrice: null, // the page only exposes one price in its structured data
      inStock: availability ? availability.endsWith("/InStock") : null,
      brand: ld.brand?.name ?? null,
      mpn: ld.mpn ?? null,
    };
  }
}

// Product pages embed their data as JSON-LD (schema.org) inside a script tag
function extractProductJsonLd(html: string): LdProduct | null {
  const blocks = html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g,
  );

  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      const candidates = Array.isArray(data) ? data : [data];
      const product = candidates.find((item) => item?.["@type"] === "Product");
      if (product) return product as LdProduct;
    } catch {
      // Ignore blocks that are not valid JSON and keep looking
    }
  }
  return null;
}