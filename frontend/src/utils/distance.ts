import type { Branch } from "../services/api";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// For each store, the closest branch to a given point
export type NearestByStore = Record<string, { name: string; km: number }>;

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Haversine formula: distance between two points on the surface of a sphere
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function nearestByStore(
  branches: Branch[],
  from: Coordinates,
): NearestByStore {
  const result: NearestByStore = {};

  for (const branch of branches) {
    const km = distanceKm(from, branch);
    const current = result[branch.store];
    if (!current || km < current.km) {
      result[branch.store] = { name: branch.name, km };
    }
  }

  return result;
}