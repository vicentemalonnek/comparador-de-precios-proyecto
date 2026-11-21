# PC Price Comparator

Web app that compares prices of PC components (processors, RAM and SSDs) across Chilean stores, keeps a price history and shows the nearest store branches. Individual project for TICS316 Software Design (UAI), topic 4B.

## Features

- **Cross-store comparison:** the same product is grouped across stores and the cheapest offer is highlighted.
- **Scrapers for 2 stores:** PC Factory (internal price API) and PC Express (JSON-LD from a hand-picked product list). One pass per day, with pauses between requests and an identifying User-Agent.
- **Price and stock history:** every scrape appends a row, so prices are never overwritten. The product page shows a line chart.
- **Google login (SSO):** OAuth 2.0 authorization code flow with PKCE, server-side sessions and an HttpOnly cookie.
- **Geolocation:** the browser computes the distance to each store branch (Haversine). The user's location is never sent to the server.
- **Multi-language:** Spanish and English with our own translation files (react-i18next); prices, distances and dates follow the selected locale.
- **Responsive:** works from phone to desktop.
- **Material Design look:** color roles, elevation, shape and states follow Material Design 3, with automatic light and dark themes (tokens in `frontend/src/index.css`).

## Tech stack

| Part | Technology |
|------|------------|
| Backend | Deno, `Deno.serve`, SQLite (`node:sqlite`) |
| Frontend | React 19, Vite, TypeScript, react-i18next |
| Auth | Google OAuth 2.0 (PKCE) |

## Requirements

- [Deno](https://deno.com) 2.x
- A Google OAuth client (only for login)

## Setup

```bash
git clone https://github.com/vicentemalonnek/comparador-de-precios-proyecto.git
cd comparador-de-precios-proyecto
```

### Backend

```bash
cd backend
cp .env.example .env      # on Windows: copy .env.example .env
```

Fill in `.env`:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (never commit it) |
| `BACKEND_URL` | `http://localhost:8000` |
| `FRONTEND_URL` | `http://localhost:5173` |

In the Google Cloud console, add `http://localhost:8000/auth/google/callback` to the authorized redirect URIs of the client.

```bash
deno task seed:branches   # load store branches (once)
deno task scrape:all      # fetch prices (run once a day to build history)
deno task dev             # API at http://localhost:8000
```

The database is created automatically at startup and the migrations in `backend/src/db/migrations` run in order.

### Frontend

```bash
cd frontend
deno install
deno task dev             # http://localhost:5173
```

Open the app at `http://localhost:5173` (not `127.0.0.1`) so the session cookie and CORS match.

## Useful commands

| Command | Where | What it does |
|---------|-------|--------------|
| `deno task dev` | backend | API with auto-reload |
| `deno task scrape:pcfactory` | backend | Scrape PC Factory |
| `deno task scrape:pcexpress` | backend | Scrape PC Express |
| `deno task scrape:all` | backend | Scrape both stores |
| `deno task seed:branches` | backend | Load branches from `seed/branches.json` |
| `deno task test` | backend | Unit tests for product matching |
| `deno task test` | frontend | Unit tests for distance calculation |
| `deno task lint` | frontend | ESLint |
| `deno task build` | frontend | Type-check and production build |

## Daily scraping

Each scrape appends new prices, so running it once a day builds the history shown in the charts. To automate it on Windows, register a scheduled task once (PowerShell, from the repository root):

```powershell
$script = (Resolve-Path backend\scripts\run-daily-scrape.ps1).Path
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 12:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "PriceComparatorScrape" -Action $action -Trigger $trigger -Settings $settings
```

The output of every run is appended to `backend/data/scrape.log`. The task only runs while the computer is on; `StartWhenAvailable` runs it as soon as the computer wakes if a run was missed. To remove it: `Unregister-ScheduledTask -TaskName PriceComparatorScrape`.

## API

| Route | Description |
|-------|-------------|
| `GET /health` | Service status |
| `GET /api/products?category=cpu` | Products with latest price and stock |
| `GET /api/comparisons?category=cpu` | Same product grouped across stores |
| `GET /api/products/:id/prices` | Price history of a product |
| `GET /api/branches` | Store branches with coordinates |
| `GET /auth/google`, `GET /auth/google/callback` | Google login |
| `GET /auth/me`, `POST /auth/logout` | Current session and logout |

## Project structure

```
backend/
  main.ts            HTTP server and routes
  src/db/            SQLite client and migrations
  src/scrapers/      Polite fetcher, base scraper, one scraper per store
  src/services/      Prices, products, matching, auth, branches
  scripts/           Scraper and seed entry points
frontend/src/
  pages/ components/ hooks/ services/ utils/ i18n/ styles/
docs/
  REQUIREMENTS.md    Requirements and decisions log
  DATA_SOURCES.md    Research on each store
  CREDITS.md         AI assistance, libraries and sources
```

## Design decisions

- **SQLite:** a single file with no setup, and a relational model that fits price history.
- **Append-only prices:** history comes for free; the latest price is the newest row.
- **Conservative matching:** two offers are merged only when each store has exactly one candidate with the same model key, so a wrong match is less likely than a missed one.
- **Polite scraping:** we stop on 401/403/429/503 and never try to bypass anti-bot protection. SP Digital and Winpy were discarded for that reason (see `docs/DATA_SOURCES.md`).
- **Location stays in the browser:** distances are computed on the client.

The full decisions log is in `docs/REQUIREMENTS.md`.

## Project status

Done: two scrapers with a daily scheduled run, price history, comparison across stores, Google login, i18n (es/en), geolocation with nearest branch, unit tests for matching and distance (the tests found and fixed a bug: SSD capacities such as 480GB were not recognized).

Known limits:
- Only 2 stores; the other candidates block automated requests.
- No per-branch stock (PC Factory disallows that route in its `robots.txt`) and no opening hours yet.
- Some product names from PC Factory are derived from the URL and look rough.
- Runs locally; not deployed yet.

Next: deployment.

## Credits

Libraries, data sources and AI assistance are listed in [docs/CREDITS.md](docs/CREDITS.md).
