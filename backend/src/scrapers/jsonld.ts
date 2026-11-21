// Reads the schema.org Product data that many online stores embed in their
// pages as JSON-LD (<script type="application/ld+json">). Stores publish it so
// search engines can show prices, so it is the most stable place to read them.

export interface LdOffer {
  price?: string | number;
  lowPrice?: string | number; // AggregateOffer
  availability?: string;
}

export interface LdProduct {
  "@type"?: string | string[];
  name?: string;
  sku?: string;
  mpn?: string;
  brand?: { name?: string } | string;
  offers?: LdOffer | LdOffer[];
}

export interface ProductData {
  name: string;
  price: number;
  inStock: boolean | null;
  brand: string | null;
  mpn: string | null;
}

function isProduct(item: unknown): item is LdProduct {
  const type = (item as LdProduct | null)?.["@type"];
  return type === "Product" ||
    (Array.isArray(type) && type.includes("Product"));
}

// Some stores put a single object, others a list or an "@graph" with many nodes
function findProduct(data: unknown): LdProduct | null {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (isProduct(item)) return item;
    const graph = (item as { "@graph"?: unknown[] } | null)?.["@graph"];
    if (Array.isArray(graph)) {
      const product = graph.find(isProduct);
      if (product) return product;
    }
  }
  return null;
}

export function extractProductJsonLd(html: string): LdProduct | null {
  const blocks = html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g,
  );
  for (const block of blocks) {
    try {
      const product = findProduct(JSON.parse(block[1]));
      if (product) return product;
    } catch {
      // Ignore blocks that are not valid JSON and keep looking
    }
  }
  return null;
}

// Turns the raw JSON-LD into the few fields the comparator needs
export function readProductData(ld: LdProduct | null): ProductData | null {
  if (!ld?.name) return null;

  const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const price = Number(offer?.price ?? offer?.lowPrice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const availability = offer?.availability;
  const brand = typeof ld.brand === "string" ? ld.brand : ld.brand?.name;

  return {
    name: ld.name.trim(),
    price: Math.round(price),
    inStock: availability ? /\/InStock$/i.test(availability) : null,
    brand: brand ?? null,
    mpn: ld.mpn ?? ld.sku ?? null,
  };
}
