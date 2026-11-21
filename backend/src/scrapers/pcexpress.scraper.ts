import { PoliteFetcher } from "./http.ts";
import { extractProductJsonLd, readProductData } from "./jsonld.ts";
import type {
  ProductCategory,
  ScrapedProduct,
  Scraper,
} from "./base.scraper.ts";

// robots.txt sets no Crawl-delay; 3 seconds is a polite pause
const DELAY_MS = 3000;
const PRODUCT_LIST = new URL(
  "./lists/pcexpress-products.json",
  import.meta.url,
);

type ProductList = Partial<Record<ProductCategory, string[]>>;

export class PcExpressScraper implements Scraper {
  readonly storeName = "PC Express";
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
    const response = await this.fetcher.get(url);
    if (!response.ok) {
      console.warn(`Skipped ${url}: status ${response.status}`);
      return null;
    }

    const data = readProductData(extractProductJsonLd(await response.text()));
    const externalId = url.match(/tienda\.pc-express\.cl\/(\d+)-/)?.[1];

    if (!data || !externalId) {
      console.warn(`Skipped ${url}: product data not found`);
      return null;
    }

    return {
      externalId,
      url,
      category,
      cashPrice: null, // the page only exposes one price in its structured data
      ...data,
    };
  }
}
