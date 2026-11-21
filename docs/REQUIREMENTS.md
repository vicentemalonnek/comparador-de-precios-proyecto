# Requirements

Project: PC Price Comparator (topic 4B), TICS316-2-2026.

## Selected categories

The assignment asks for 3 categories out of the listed ones (RAM, GPU, processor, memory, SSD / HDD + capacity, budget, reviews). Selected:

1. Processor (CPU)
2. RAM
3. SSD (internal drives, with capacity)

GPU was considered first, but the main source (PC Factory) lists almost none in its sitemap. It may be added later with a hand-picked list of products.

## Functional requirements

### Price search and comparison
- [x] Compare prices across at least 3 sources (stores): PC Factory, PC Express and Infor-Ingen.
- [x] Price history to detect trends.

### Availability by schedule, stock and location
- [ ] Scraper to determine store opening hours and relevant dates. Opening hours are entered by hand in `backend/seed/branches.json`; no store publishes them in a scrapable way.
- [x] Scrapers to check stock (per store; per-branch stock is not available).
- [x] Geolocation to show nearby availability.

## General technical requirements

- [x] Fully responsive, adapting to any screen size.
- [x] SSO for login (Google).
- [x] Custom multi-language support (no external APIs such as Google Translate): Spanish and English.
- [x] Code in English following good practices (ongoing).
- [x] Code from others or generated with AI credited in `CREDITS.md`.
- [x] At least one commit every week (Monday to Sunday), starting Monday, October 5 (ongoing).

## Evaluation

- 70%: iterative process, weekly commits and incremental improvements.
- 30%: demo (max 5 min, no slides) and technical questions about the code.

## Decisions log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-10-08 | Stack: Deno (backend) + React (frontend) | |
| 2026-10-24 | Database: SQLite | Single file, no setup; relational model for price history |
| 2026-10-24 | SP Digital discarded as a source | Cloudflare returns 403 to automated requests; see docs/DATA_SOURCES.md |
| 2026-10-31 | PC Factory as first source | Internal price API answers plain requests; grey area, minimal usage; see docs/DATA_SOURCES.md |
| 2026-10-31 | Categories: CPU, RAM and SSD instead of GPU | The PC Factory sitemap has almost no GPU products |
| 2026-10-31 | Scraping rules | One pass per day, pause between requests, identifying User-Agent, only factual data (name, price, availability, URL) |
| 2026-11-14 | PC Express as second source with a hand-picked product list | Winpy and SP Digital block automated requests; PC Express exposes price, mpn and availability as JSON-LD; see docs/DATA_SOURCES.md |
| 2026-11-16 | Geolocation: nearest branches, distance computed in the browser | Per-branch stock is not available (PC Factory disallows its per-store stock route in robots.txt); user location never reaches the server |
| 2026-11-21 | Infor-Ingen as third source, through its WooCommerce Store API | Its robots.txt only blocks named AI and scraping bots; the pages have no Product JSON-LD but the public Store API returns name, prices and stock; see docs/DATA_SOURCES.md |
| 2026-11-21 | Deploy on Vercel with Turso as the database | Deno Deploy no longer accepts new sign-ups (it closes in April 2027); Turso keeps the SQLite schema; the backend runs as a Vercel Function on the same domain as the frontend |