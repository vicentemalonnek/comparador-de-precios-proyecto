import assert from "node:assert/strict";
import { distanceKm, nearestByStore } from "../src/utils/distance.ts";

const santiago = { latitude: -33.4489, longitude: -70.6693 };
const valparaiso = { latitude: -33.0472, longitude: -71.6127 };

Deno.test("distance between the same point is zero", () => {
  assert.equal(distanceKm(santiago, santiago), 0);
});

Deno.test("Santiago to Valparaiso is about 100 km", () => {
  const km = distanceKm(santiago, valparaiso);
  assert.ok(km > 95 && km < 105, `got ${km}`);
});

Deno.test("distance is symmetric", () => {
  assert.ok(
    Math.abs(distanceKm(santiago, valparaiso) - distanceKm(valparaiso, santiago)) < 1e-9,
  );
});

Deno.test("nearestByStore picks the closest branch of each store", () => {
  const branch = (id: number, store: string, name: string, c: typeof santiago) => ({
    id, store, name, address: "", openingHours: null, ...c,
  });
  const branches = [
    branch(1, "PC Factory", "Valparaiso", valparaiso),
    branch(2, "PC Factory", "Santiago", santiago),
    branch(3, "PC Express", "Valparaiso", valparaiso),
  ];

  const result = nearestByStore(branches, santiago);

  assert.equal(result["PC Factory"].name, "Santiago");
  assert.equal(result["PC Factory"].km, 0);
  assert.equal(result["PC Express"].name, "Valparaiso");
});
