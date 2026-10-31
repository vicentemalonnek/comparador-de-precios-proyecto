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
- [ ] Compare prices across at least 3 sources (stores).
- [ ] Price history to detect trends.

### Availability by schedule, stock and location
- [ ] Scraper to determine store opening hours and relevant dates.
- [ ] Scrapers to check stock.
- [ ] Geolocation to show nearby availability.

## General technical requirements

- [ ] Fully responsive, adapting to any screen size.
- [ ] SSO for login.
- [ ] Custom multi-language support (no external APIs such as Google Translate). Base in place: Spanish and English files; more screens to translate.
- [x] Code in English following good practices (ongoing).
- [ ] Code from others or generated with AI credited in `CREDITS.md`.
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