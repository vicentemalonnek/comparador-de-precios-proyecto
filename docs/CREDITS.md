# Credits

## AI assistance

Claude (Anthropic) was used throughout the project for design discussion and as a source of code, which I reviewed, tested and adapted. Main areas: project structure, SQLite schema, scrapers and the HTTP client, products page, i18n setup, the Google SSO flow, the Turso HTTP client and the Vercel deployment.

## Third-party libraries

React, Vite, i18next / react-i18next, Deno (including its built-in node:sqlite module), Roboto font (Google Fonts, Apache 2.0), rolldown (bundles the backend for Vercel).

## Data sources

Product names and prices come from PC Factory (pcfactory.cl), PC Express (tienda.pc-express.cl) and Infor-Ingen (store.infor-ingen.com). Every product links back to the original page.

## Reference

Google Identity: OAuth 2.0 for web server applications (authorization code flow with PKCE).

Turso HTTP API reference (docs.turso.tech/sdk/http/reference) and Vercel Functions documentation (vercel.com/docs/functions).

## Services

Vercel (hosting) and Turso (database), both on their free plans.