// Locally the backend runs on its own port. In production (Vercel) the backend
// is a function on the same domain, so relative URLs such as "/api/..." work.
export const API_URL: string = import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://localhost:8000");

export type CategoryFilter = "all" | "cpu" | "ram" | "ssd";

export interface Product {
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

export async function fetchProducts(
  category: CategoryFilter,
  signal?: AbortSignal,
): Promise<Product[]> {
  const query = category === "all" ? "" : `?category=${category}`;
  const response = await fetch(`${API_URL}/api/products${query}`, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as Product[];
}

export interface PricePoint {
  store: string;
  price: number;
  cashPrice: number | null;
  scrapedAt: string;
}

export async function fetchPriceHistory(
  productId: number,
  signal?: AbortSignal,
): Promise<PricePoint[]> {
  const response = await fetch(`${API_URL}/api/products/${productId}/prices`, {
    signal,
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as PricePoint[];
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

export interface Comparison {
  key: string;
  name: string;
  category: string;
  brand: string | null;
  offers: ComparisonOffer[]; // cheapest first
}

export async function fetchComparisons(
  category: CategoryFilter,
  signal?: AbortSignal,
): Promise<Comparison[]> {
  const query = category === "all" ? "" : `?category=${category}`;
  const response = await fetch(`${API_URL}/api/comparisons${query}`, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as Comparison[];
}

export interface Branch {
  id: number;
  store: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
}

export async function fetchBranches(signal?: AbortSignal): Promise<Branch[]> {
  const response = await fetch(`${API_URL}/api/branches`, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as Branch[];
}