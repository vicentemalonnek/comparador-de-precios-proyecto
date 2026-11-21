# PC Price Comparator

Web app that compares prices of PC components (processors, RAM and SSDs) across Chilean stores, keeps a price history and shows the nearest store branches. Individual project for TICS316 Software Design (UAI), topic 4B.

**Live app:** https://comparador-de-precios-proyecto-vm-8892.vercel.app

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
| Backend | Deno locally; the same code runs as a Vercel Function in production |
| Database | Turso (SQLite in the cloud), reached through its HTTP API |
| Frontend | React 19, Vite, TypeScript, react-i18next |
| Auth | Google OAuth 2.0 (PKCE) |
| Hosting | Vercel (frontend and backend on the same domain) |

## Requirements

- [Deno](https://deno.com) 2.x
- A [Turso](https://turso.tech) database (URL and auth token)
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
| `TURSO_DATABASE_URL` | `libsql://...turso.io` URL of the database |
| `TURSO_AUTH_TOKEN` | Turso token with read and write access (never commit it) |

In the Google Cloud console, add `http://localhost:8000/auth/google/callback` to the authorized redirect URIs of the client.

```bash
deno task migrate         # create the tables in Turso (safe to run again)
deno task seed:branches   # load store branches (once)
deno task scrape:all      # fetch prices (run once a day to build history)
deno task dev             # API at http://localhost:8000
```

The migrations in `backend/src/db/migrations` use `IF NOT EXISTS`, so `deno task migrate` can be run again safely. `deno task db:copy-local` copies an old local `data/app.db` into Turso, keeping the ids and the price history.

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

## Deployment

The Vercel project builds the `frontend` folder:

1. The `build` script bundles `backend/src/app.ts` into `frontend/server/backend.js` with rolldown, then builds the React app.
2. `frontend/api/index.ts` is a Vercel Function that runs that same backend handler.
3. `frontend/vercel.json` sends `/api/*`, `/auth/*` and `/health` to the function, so the page and the API share one domain and the session cookie works without CORS.

Environment variables in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (sensitive) and `BACKEND_URL` / `FRONTEND_URL` (the public URL). The public URL plus `/auth/google/callback` must be an authorized redirect URI of the Google client. Every push to `main` deploys to production.

The scrapers keep running on a local computer (see below) and write straight to Turso, so the live site shows the new prices without a redeploy.

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
  main.ts            Local server (Deno.serve)
  src/app.ts         HTTP routes, shared by the local server and Vercel
  src/db/            Turso HTTP client and migrations
  src/scrapers/      Polite fetcher, base scraper, one scraper per store
  src/services/      Prices, products, matching, auth, branches
  scripts/           Scrapers, seed, migrations and data copy
frontend/
  api/index.ts       Vercel Function that runs the backend
  vercel.json        Rewrites /api, /auth and /health to the function
frontend/src/
  pages/ components/ hooks/ services/ utils/ i18n/ styles/
docs/
  REQUIREMENTS.md    Requirements and decisions log
  DATA_SOURCES.md    Research on each store
  CREDITS.md         AI assistance, libraries and sources
```

## Design decisions

- **SQLite, then Turso:** SQLite gave a relational model that fits price history. To deploy it, the same schema moved to Turso, a hosted SQLite, so the SQL did not change.
- **No database library:** the backend talks to Turso with `fetch` over its HTTP API (`backend/src/db/client.ts`), so the same code runs in Deno and in Node (Vercel) without dependency problems.
- **One domain:** the backend runs as a Vercel Function next to the frontend, which keeps the login cookie first-party and removes CORS in production.
- **Append-only prices:** history comes for free; the latest price is the newest row.
- **Conservative matching:** two offers are merged only when each store has exactly one candidate with the same model key, so a wrong match is less likely than a missed one.
- **Polite scraping:** we stop on 401/403/429/503 and never try to bypass anti-bot protection. SP Digital and Winpy were discarded for that reason (see `docs/DATA_SOURCES.md`).
- **Location stays in the browser:** distances are computed on the client.

The full decisions log is in `docs/REQUIREMENTS.md`.

## Project status

Done: deployed on Vercel with a Turso database, two scrapers with a daily scheduled run, price history, comparison across stores, Google login, i18n (es/en), geolocation with nearest branch, unit tests for matching and distance (the tests found and fixed a bug: SSD capacities such as 480GB were not recognized).

Known limits:
- Only 2 stores; the other candidates block automated requests.
- No per-branch stock (PC Factory disallows that route in its `robots.txt`); branch opening hours are entered by hand in `backend/seed/branches.json`, not scraped.
- Some product names from PC Factory are derived from the URL and look rough.
- The scrapers run on a personal computer, so the history only grows on days it is on.

Next: more stores if one allows automated requests, and trimming whitespace in some PC Factory URLs.

## Credits

Libraries, data sources and AI assistance are listed in [docs/CREDITS.md](docs/CREDITS.md).
