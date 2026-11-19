import assert from "node:assert/strict";
import { groupOffers, matchKey } from "./matching.service.ts";

Deno.test("cpu: the same Ryzen gets one key whatever the store wording", () => {
  const pcfactory = matchKey("cpu", "Procesador AMD Ryzen 7 9800X 3D 4.7GHz AM5");
  const pcexpress = matchKey("cpu", "Procesador AMD Ryzen 7 9800X3D 8 nucleos");
  assert.equal(pcfactory, "ryzen7-9800x3d");
  assert.equal(pcexpress, pcfactory);
});

Deno.test("cpu: Intel suffixes keep different models apart", () => {
  const plain = matchKey("cpu", "Procesador Intel Core i5-12400 2.5GHz S1700");
  const withF = matchKey("cpu", "Procesador Intel i5-12400F 2.5GHz S1700");
  assert.equal(plain, "i5-12400");
  assert.equal(withF, "i5-12400f");
  assert.notEqual(plain, withF);
});

Deno.test("ram: capacity, speed, generation and kit are part of the key", () => {
  const single = matchKey("ram", "Memoria Kingston Fury Beast DDR4 8GB 3200MHz");
  const other = matchKey("ram", "Memoria Kingston Fury Beast DDR4 16GB 3200MHz");
  const kit = matchKey("ram", "Kit Kingston Fury Beast DDR4 2x8GB 3200MHz");
  assert.notEqual(single, null);
  assert.notEqual(single, other);
  assert.notEqual(single, kit);
});

Deno.test("ram: SODIMM (laptop) is not the same as DIMM (desktop)", () => {
  const desktop = matchKey("ram", "Memoria Kingston DDR4 8GB 3200MHz");
  const laptop = matchKey("ram", "Memoria SODIMM Kingston DDR4 8GB 3200MHz");
  assert.notEqual(desktop, laptop);
});

Deno.test("ssd: Western Digital is normalized to wd", () => {
  const a = matchKey("ssd", "SSD Western Digital Green SN3000 500GB NVMe");
  const b = matchKey("ssd", "SSD WD Green SN3000 500GB M.2");
  assert.notEqual(a, null);
  assert.equal(a, b);
});

Deno.test("ssd: different capacity gives a different key", () => {
  const small = matchKey("ssd", "SSD Kingston A400 480GB");
  const big = matchKey("ssd", "SSD Kingston A400 960GB");
  assert.notEqual(small, big);
});

Deno.test("matchKey returns null when the name is not recognizable", () => {
  assert.equal(matchKey("cpu", "Procesador generico"), null);
  assert.equal(matchKey("ram", "Memoria sin datos"), null);
  assert.equal(matchKey("ssd", "Disco duro externo"), null);
  assert.equal(matchKey("gpu", "RTX 4060"), null);
});

Deno.test("groupOffers merges one listing per store of the same product", () => {
  const items = [
    { name: "Procesador AMD Ryzen 5 5600X", category: "cpu", store: "PC Factory" },
    { name: "Procesador AMD Ryzen 5 5600X 3.7GHz", category: "cpu", store: "PC Express" },
  ];
  const groups = groupOffers(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
});

Deno.test("groupOffers does not merge when a store has two candidates", () => {
  const items = [
    { name: "Procesador AMD Ryzen 5 5600X", category: "cpu", store: "PC Factory" },
    { name: "Ryzen 5 5600X caja", category: "cpu", store: "PC Factory" },
    { name: "Procesador AMD Ryzen 5 5600X 3.7GHz", category: "cpu", store: "PC Express" },
  ];
  const groups = groupOffers(items);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => g.length === 1));
});

Deno.test("groupOffers keeps a product sold by one store alone", () => {
  const items = [
    { name: "Procesador AMD Ryzen 5 5600X", category: "cpu", store: "PC Factory" },
  ];
  assert.deepEqual(groupOffers(items), [items]);
});

Deno.test("groupOffers keeps unrecognized listings separate", () => {
  const items = [
    { name: "Procesador generico", category: "cpu", store: "PC Factory" },
    { name: "Procesador generico", category: "cpu", store: "PC Express" },
  ];
  assert.equal(groupOffers(items).length, 2);
});

Deno.test("ssd: decimal terabytes such as 1.5TB are kept", () => {
  const key = matchKey("ssd", "SSD Kingston A400 1.5TB");
  assert.equal(key, "kingston|1.5tb|a400");
});
