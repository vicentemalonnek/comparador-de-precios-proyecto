# Credits

## AI assistance

Claude (Anthropic) was used throughout the project for design discussion and as a source of code, which I reviewed, tested and adapted. Main areas: project structure, SQLite schema, scrapers and the HTTP client, products page, i18n setup and the Google SSO flow.

## Third-party libraries

React, Vite, i18next / react-i18next, Deno (including its built-in node:sqlite module).

## Data sources

Product names and prices come from PC Factory (pcfactory.cl). Every product links back to the original page.

## Reference

Google Identity: OAuth 2.0 for web server applications (authorization code flow with PKCE).