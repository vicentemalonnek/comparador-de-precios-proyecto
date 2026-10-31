import { PoliteFetcher } from "./http.ts";
import type { ProductCategory, ScrapedProduct, Scraper } from "./base.scraper.ts";

const SITE_URL = "https://www.pcfactory.cl";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const PRICE_API_URL =
  "https://api.pcfactory.cl/pcfactory-services-catalogo/v1/catalogo/productos";
const DELAY_MS = 2000;

// Filters applied to the slug of the product URL (the part after the id)
const CATEGORY_FILTERS: Record<
  Exclude<ProductCategory, "gpu">,
  { include: RegExp; exclude?: RegExp }
> = {
  cpu: { include: /^(amd|intel)-cpu-/, exclude: /xeon/ },
  ram: { include: /memoria-ram/ },
  ssd: { include: /unidad-ssd/, exclude: /externa|portable|cofre/ },
};

interface Candidate {
  externalId: string;
  slug: string;
  url: string;
  category: ProductCategory;
}

interface PriceResponse {
  precio?: { normal?: number | null; efectivo?: number | null };
}

export interface PcFactoryScraperOptions {
  limitPerCategory?: number; // useful for quick tests
}

export class PcFactoryScraper implements Scraper {
  readonly storeName = "PC Factory";
  private readonly fetcher = new PoliteFetcher(DELAY_MS);
  private readonly limitPerCategory?: number;

  constructor(options: PcFactoryScraperOptions = {}) {
    this.limitPerCategory = options.limitPerCategory;
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const candidates = await this.loadCandidates();
    console.log(`Found ${candidates.length} candidate products in the sitemap.`);

    const results: ScrapedProduct[] = [];
    for (const [index, candidate] of candidates.entries()) {
      console.log(
        `[${index + 1}/${candidates.length}] ${candidate.category} ${candidate.externalId}`,
      );
      const product = await this.scrapeProduct(candidate);
      if (product) results.push(product);
    }
    return results;
  }

  private async loadCandidates(): Promise<Candidate[]> {
    const response = await this.fetcher.get(SITEMAP_URL);
    if (!response.ok) {
      throw new Error(`Could not read sitemap (${response.status})`);
    }
    const xml = await response.text();

    const all: Candidate[] = [];
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = match[1];
      const parsed = url.match(/\/producto\/(\d+)-([^/?#]+)$/);
      if (!parsed) continue;

      const category = categorize(parsed[2]);
      if (category) {
        all.push({ externalId: parsed[1], slug: parsed[2], url, category });
      }
    }

    if (this.limitPerCategory === undefined) return all;

    const counts: Record<string, number> = {};
    return all.filter((c) => {
      counts[c.category] = (counts[c.category] ?? 0) + 1;
      return counts[c.category] <= this.limitPerCategory!;
    });
  }

  private async scrapeProduct(candidate: Candidate): Promise<ScrapedProduct | null> {
    const response = await this.fetcher.get(
      `${PRICE_API_URL}/${candidate.externalId}/precio`,
    );
    if (!response.ok) {
      console.warn(`Skipped ${candidate.externalId}: status ${response.status}`);
      return null;
    }

    const data = (await response.json()) as PriceResponse;
    const normal = data.precio?.normal;
    if (typeof normal !== "number" || normal <= 0) {
      console.warn(`Skipped ${candidate.externalId}: no valid price`);
      return null;
    }

    const cash = data.precio?.efectivo;
    return {
      externalId: candidate.externalId,
      // The price API does not return a name, so it is derived from the URL slug
      name: candidate.slug.replaceAll("-", " "),
      url: candidate.url,
      category: candidate.category,
      price: Math.round(normal),
      cashPrice: typeof cash === "number" && cash > 0 ? Math.round(cash) : null,
      inStock: null, // the price API does not report stock
      // In this store the brand is the first word of the slug (approximation)
      brand: candidate.slug.split("-")[0] ?? null,
      mpn: null, // not available from this store
    };
  }
}

function categorize(slug: string): ProductCategory | null {
  for (const [category, filter] of Object.entries(CATEGORY_FILTERS)) {
    if (filter.include.test(slug) && !filter.exclude?.test(slug)) {
      return category as ProductCategory;
    }
  }
  return null;
}