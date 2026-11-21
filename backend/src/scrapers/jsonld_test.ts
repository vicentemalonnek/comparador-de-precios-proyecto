import assert from "node:assert/strict";
import { extractProductJsonLd, readProductData } from "./jsonld.ts";

const page = (json: unknown) =>
  `<html><head><script type="application/ld+json">${
    JSON.stringify(json)
  }</script></head></html>`;

Deno.test("reads a single Product object (PC Express style)", () => {
  const html = page({
    "@type": "Product",
    name: "Procesador AMD Ryzen 5 5600X",
    mpn: "100-100000065BOX",
    brand: { name: "AMD" },
    offers: { price: "119990", availability: "https://schema.org/InStock" },
  });

  assert.deepEqual(readProductData(extractProductJsonLd(html)), {
    name: "Procesador AMD Ryzen 5 5600X",
    price: 119990,
    inStock: true,
    brand: "AMD",
    mpn: "100-100000065BOX",
  });
});

Deno.test("finds the Product inside an @graph with a list of offers (WooCommerce style)", () => {
  const html = page({
    "@context": "https://schema.org/",
    "@graph": [
      { "@type": "BreadcrumbList" },
      {
        "@type": "Product",
        name: " Intel CPU Core i7-14700F 2.1GHz ",
        sku: "BX8071514700F",
        offers: [{
          price: "389990",
          availability: "http://schema.org/OutOfStock",
        }],
      },
    ],
  });

  const data = readProductData(extractProductJsonLd(html));
  assert.equal(data?.name, "Intel CPU Core i7-14700F 2.1GHz");
  assert.equal(data?.price, 389990);
  assert.equal(data?.inStock, false);
  assert.equal(data?.mpn, "BX8071514700F"); // sku is used when there is no mpn
});

Deno.test("uses lowPrice when the store publishes an AggregateOffer", () => {
  const html = page({
    "@type": "Product",
    name: "SSD Kingston A400 480GB",
    offers: { "@type": "AggregateOffer", lowPrice: 32990 },
  });
  assert.equal(readProductData(extractProductJsonLd(html))?.price, 32990);
});

Deno.test("skips broken JSON blocks and keeps looking", () => {
  const html = `<script type="application/ld+json">{ not json }</script>` +
    page({ "@type": "Product", name: "RAM", offers: { price: 1000 } });
  assert.equal(readProductData(extractProductJsonLd(html))?.name, "RAM");
});

Deno.test("returns null when there is no usable price", () => {
  const html = page({ "@type": "Product", name: "Sin precio", offers: {} });
  assert.equal(readProductData(extractProductJsonLd(html)), null);
  assert.equal(readProductData(extractProductJsonLd("<html></html>")), null);
});
