import { getDb } from "../db/client.ts";

export interface Branch {
  id: number;
  store: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
}

export async function listBranches(): Promise<Branch[]> {
  const { rows } = await getDb().execute(
    `SELECT b.id, s.name AS store, b.name, b.address, b.latitude, b.longitude,
            b.opening_hours AS openingHours
     FROM store_branches b
     JOIN stores s ON s.id = b.store_id
     ORDER BY s.name, b.name`,
  );
  return rows as unknown as Branch[];
}
