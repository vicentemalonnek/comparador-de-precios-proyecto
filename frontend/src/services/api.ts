const API_URL = "http://localhost:8000";

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