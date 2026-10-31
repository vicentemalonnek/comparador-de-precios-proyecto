export type ProductCategory = "cpu" | "gpu" | "ram" | "ssd";

export interface ScrapedProduct {
  externalId: string; // the store's own product id
  name: string;
  url: string;
  category: ProductCategory;
  price: number; // normal price, in CLP
  cashPrice: number | null;
  inStock: boolean | null; // null when the store does not tell
  brand: string | null;
  mpn: string | null; // manufacturer part number
}

export interface Scraper {
  readonly storeName: string;
  scrape(): Promise<ScrapedProduct[]>;
}