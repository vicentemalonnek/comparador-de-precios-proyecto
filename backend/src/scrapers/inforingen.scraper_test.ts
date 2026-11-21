import assert from "node:assert/strict";
import { toScrapedProduct } from "./inforingen.scraper.ts";

const URL =
  "https://store.infor-ingen.com/producto/intel-cpu-core-i7-14700f-2-1ghz/";

Deno.test("Store API product: normal price and the lower discounted price", () => {
  const scraped = toScrapedProduct(
    {
      id: 20193,
      name: "INTEL CPU CORE I7 14700F 2.1GHz",
      sku: "69181",
      permalink: URL,
      is_in_stock: true,
      prices: {
        price: "409900",
        regular_price: "434494",
        currency_minor_unit: 0,
      },
    },
    "cpu",
    URL,
  );

  assert.deepEqual(scraped, {
    externalId: "20193",
    name: "INTEL CPU CORE I7 14700F 2.1GHz",
    url: URL,
    category: "cpu",
    price: 434494,
    cashPrice: 409900,
    inStock: true,
    brand: null,
    mpn: "69181",
  });
});

Deno.test("Store API product without a discount has no cash price", () => {
  const scraped = toScrapedProduct(
    {
      id: 1,
      name: "SSD Kingston A400 480GB &#8211; SATA",
      prices: { price: "32990", regular_price: "32990" },
    },
    "ssd",
    URL,
  );
  assert.equal(scraped?.price, 32990);
  assert.equal(scraped?.cashPrice, null);
  assert.equal(scraped?.name, "SSD Kingston A400 480GB – SATA");
});

Deno.test("prices with decimals are converted using currency_minor_unit", () => {
  const scraped = toScrapedProduct(
    {
      id: 2,
      name: "RAM",
      prices: { price: "1999", regular_price: "1999", currency_minor_unit: 2 },
    },
    "ram",
    URL,
  );
  assert.equal(scraped?.price, 20); // 19.99 rounded to whole pesos
});

Deno.test("a product without price is skipped", () => {
  assert.equal(
    toScrapedProduct({ id: 3, name: "X", prices: {} }, "cpu", URL),
    null,
  );
});
