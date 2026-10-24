# Data sources research

Evaluation of stores as price sources. Every candidate goes through the same checks before any scraper is written:
`robots.txt`, terms and conditions, and a plain HTTP request (no browser) to see if the price is in the response.

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

## PC Factory (pcfactory.cl): under evaluation

- `robots.txt` (www): blocks internal search, `/categorias/`, `/producto/tiendas` (probably per-store stock) and many URL parameters (`page`, `ord`, `marca`, ...). Product pages with clean URLs are not blocked. Sitemap declared and it lists product pages.
- Product page URL pattern: `/producto/{id}-{name}`. The numeric id appears in the price API.
- Price is not in the original HTML (no `ld+json`, price not found in the page source).
- Internal API found in the browser: `api.pcfactory.cl/pcfactory-services-catalogo/v1/catalogo/productos/{id}/precio`. It is not documented for third parties.
- Pending: check `api.pcfactory.cl/robots.txt`, check the terms and conditions, test the API with a plain request.

## Other stores

- Pending: test at least 2 more stores (requirement: at least 3 sources).

## Notes

- `product:mfr_part_no` (manufacturer part number) is useful to match the same product across stores. Idea: add an `mpn` column to `products`.
- Scraping rules for the project: one pass per day, a pause between requests that respects each store's `Crawl-delay`, an identifying `User-Agent`, and storing only name, price, availability and source URL (no images or long descriptions).