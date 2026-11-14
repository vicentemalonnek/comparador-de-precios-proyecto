# Data sources research

Evaluation of stores as price sources. Every candidate goes through the same checks before any scraper is written:
`robots.txt`, terms and conditions, and a plain HTTP request (no browser) to see if the data is in the response.

Test used:

```powershell
curl.exe -s -L -A "Mozilla/5.0" -o test.html -w "status: %{http_code}  bytes: %{size_download}`n" "<product-url>"
```

## SP Digital (spdigital.cl): discarded

- `robots.txt`: permissive. Only cart, checkout and account routes are blocked. `Crawl-delay: 5`. Sitemap declared.
- Terms and conditions: no explicit clause about scraping or automated access. The intellectual property clause covers site content, including "compilaciones de datos".
- Product page saved from the browser contains price and availability in `<meta>` tags (`product:price:amount`, `product:availability`, `product:mfr_part_no`).
- Plain HTTP request: **403, Cloudflare "Attention Required"** (about 4.5 KB). The site blocks automated clients.
- Decision: discarded. Bypassing an explicit anti-bot challenge is not acceptable for this project.

## PC Factory (pcfactory.cl): viable, grey area

- `robots.txt` (www): blocks internal search, `/categorias/`, `/producto/tiendas` (per-store stock) and many URL parameters (`page`, `ord`, `marca`, ...). Product pages with clean URLs are not blocked. Sitemap declared and it lists product pages.
- `api.pcfactory.cl/robots.txt`: 404 (no rules published for the API host).
- Product page pattern: `/producto/{id}-{name}`; the numeric id is used by the price API.
- Price is not in the original HTML of the product page.
- Internal price API: `GET api.pcfactory.cl/pcfactory-services-catalogo/v1/catalogo/productos/{id}/precio`
  - Plain request (no browser): **200 with JSON**, no anti-bot challenge.
  - Fields: `precio.normal`, `precio.efectivo`, `precio.debito`, `precio.referencia`, `promocion.inicio/termino`, `maximoVenta` (max units per sale, not stock).
  - Section 3 of the terms defines these prices: normal (any payment method except cash/transfer), cash (up to 5% lower), reference (informative market price, not purchasable).
  - Does not include product name, brand, manufacturer part number or stock.
- Terms of sale and privacy policy (both read in full): no clause about bots, scraping or automated extraction; no intellectual property clause. Only a generic "all rights reserved" notice in the site footer.
- An AI-generated summary claimed an explicit prohibition of automated extraction; it is not supported by the original texts.
- The API is not documented for third parties and may change without notice.
- Per-store stock is published on the site, but `/producto/tiendas` is disallowed in robots.txt, so it is not used.
- Decision: use as a source with minimal usage: one pass per day, 1 to 2 seconds between requests, identifying `User-Agent`, only factual data (name, price, availability, URL) and a link to the source page. Not the only source.

- `sitemap.xml`: flat list (no index), 1513 URLs, 1202 of them products. It is incomplete: a known product (id 56531) is not listed. Coverage by category: RAM about 25, internal SSD about 40, CPU about 30, GPU almost none.
- The price API answers for products that are in the sitemap and for ones that are not. Scanning id ranges is not acceptable (too many unnecessary requests).
- Decision: categories RAM, SSD and CPU (GPU may be added later with a hand-picked list of ids).

## Other stores

- ## Winpy (winpy.cl): discarded

- `robots.txt`: permissive. Only cart, quotes, admin routes and video files are blocked. `Crawl-delay: 5`. Sitemap declared.
- Privacy policy: about customer data; no mention of bots or scraping.
- Plain HTTP request to a product page: **403, about 5.7 KB** (anti-bot challenge). The price is not in the response.
- Decision: discarded, same reason as SP Digital. Bypassing the block is not acceptable for this project.

## PC Express (tienda.pc-express.cl): viable

- `robots.txt`: blocks only listing pages with parameters (`page`, `sort`, `order`, `limit`, filters). Product pages are not blocked. No `Crawl-delay`. No `Sitemap` declared.
- Plain HTTP request to product pages (RAM and CPU tested): **200, about 165 KB**; the price is in the HTML.
- Each product page includes `ld+json` of type `Product` with name, brand, `mpn` (manufacturer part number), price, currency, availability (`InStock`) and the product URL.
- The `ld+json` price is higher than the displayed price by about 6% in both products tested (the displayed price is 94% of it); probably a cash/transfer discount, to be confirmed.
- `sitemap.xml` exists (about 53 KB, flat list of product URLs `/{id}-{name}`), although it is not declared in robots.txt. Category filtering by name still needs to be defined.
- An AI-generated summary says no terms of use with clauses about bots were found; not verified against original texts.
- Usage rules: one request per product, a few seconds between requests, one pass per day, identifying `User-Agent`, only factual data and a link to the source page.

## Notes

- `product:mfr_part_no` (manufacturer part number) is useful to match the same product across stores. Idea: add an `mpn` column to `products`.
- Idea for `prices`: store the normal price as the main one and the cash price in a separate column; do not store the reference price.
- Scraping rules for the project: one pass per day, a pause between requests that respects each store's `Crawl-delay`, an identifying `User-Agent`, and storing only name, price, availability and source URL (no images or long descriptions).