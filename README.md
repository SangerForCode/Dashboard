# Folio

An interactive financial analytics demo built with React, TypeScript, the Next.js-compatible Vinext runtime, Tailwind, ECharts, D3, and accessible Radix/Shadcn controls.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by the server. `npm run build` creates the Cloudflare-compatible production bundle; `npm start` serves it. `npm run typecheck` checks TypeScript and `npm test` runs the financial invariants and chart rendering checks.

## Explore

- Overview: investment performance and calculated insights.
- Explore data: 13 visualization families, including candles with volume, scatter, monthly and correlation heatmaps, histogram/box plot, treemap, allocation, tree, flows, map, and network.
- Relationships: drag companies, pan, zoom, filter by relationship strength, select a company, or reset the layout.
- Portfolio: switch allocation among donut, stacked bar, treemap, hierarchy, and network.
- Transactions: simulated allocation flows with changing rupee values.
- Date, sector, company search, applicable metric and chart controls, comparison, export, and asset selection all operate on the dataset.

Pause the simulation for a stable interview walkthrough. On phones the asset table becomes cards, hierarchy becomes expandable rows, and asset details open in an accessible bottom sheet.

## Architecture

`types/market.ts` → `lib/data-generator.ts` → `lib/market-source.ts` → `lib/analytics.ts` → `lib/transformations.ts` → reusable chart/network renderers → `components/Explorer.tsx` / page UI.

The `MarketSource` adapter exposes `initial()` and `subscribe()`. Replace it with an API/WebSocket adapter to connect a real feed without rewriting chart components. The demo is client-only and intentionally has no authentication, trading, or durable user storage of its own; hosted private access is handled by Sites.

## Simulation assumptions

- Seed 42 produces 30 assets and 780 weekday observations ending September 18, 2026. Weekday history does not model exchange holidays.
- Returns combine a common market factor, sector factor, and company-specific Gaussian shock. OHLC bars obey high/low bounds. Values are synthetic, including fundamentals and scores.
- Four-second ticks update the last simulated session, its volume and allocation transaction values; they do not claim to be live exchange quotes or advance the calendar.
- Prices are represented in INR, with a fixed illustrative conversion for foreign seed prices. There is no live FX feed.
- Initial investment is ₹10 lakh. Portfolio value and risk use fixed-share buy-and-hold holdings. Allocation visuals show original capital weights, not rebalanced current market weights.
- Correlation uses 60 observations. Volatility uses up to 30 daily changes annualized with √252. Box plots use Tukey whiskers with separate outliers. Distribution is across the selected assets.
- Correlation displays up to 14 matching assets and monthly heatmaps up to 10 to limit density; search and sector filtering focus the universe.
- The 1D time range shows the previous close and current daily observation. It is not a synthetic intraday feed.
- Map markers represent headquarters **countries**, not precise addresses or revenue exposure. Boundaries are Natural Earth public-domain 110m geometry, vendored from https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson.

## Validation

TypeScript and production build pass. Tests cover reproducibility, OHLC integrity, positive prices, normalized weights, weekday dates, immutable updates, dynamic charts/transactions, correlations, stronger same-sector relationships, date filtering, empty/single-asset inputs, and 60 ECharts SVG renders at widths 320, 375, 390, 430, and 1100.

Full browser/touch/keyboard interaction and visual layout testing could not be performed in the authoring environment: no browser connector was available and native computer-use permission was unavailable. SVG rendering checks are not substitutes for device QA. The optional feature-detected WebMCP configure tool was not verified in a supporting browser.

Known demo scope: 30 assets; large-universe performance is not benchmarked. The network renders a small SVG graph. CSV export contains the current filtered synthetic asset data. These are simulated analytics, not investment recommendations.

## Deploy to the Syncqtech Cloudflare account

```sh
npm run deploy:cloudflare
```

This builds the app and deploys the `folio-analytics` Worker using `wrangler.cloudflare.jsonc`, pinned to Syncqtech@gmail.com's account. Run `npx wrangler whoami` to check your active Cloudflare login. A user with access to that account must be authenticated.

`npm run deploy:cloudflare:check` builds and performs a dry run without publishing. The direct Cloudflare deployment uses a public workers.dev URL, serves the same synthetic demo, and enables Worker logs and sampled traces. The existing private Sites deployment is separate.

Live URL: https://folio-analytics.syncqtech.workers.dev

The compatibility date uses the deployment's UTC date (2026-09-19); Cloudflare rejects dates later than its current UTC day.
