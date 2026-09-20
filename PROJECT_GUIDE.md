# Folio — Quick Project Guide

Folio is a financial analytics demo with 30 simulated assets, automatic updates, interactive charts, and calculated insights. It uses React, TypeScript, Tailwind CSS, Vinext (a Next.js-compatible runtime), ECharts, and D3.

**Live app:** https://folio-analytics.syncqtech.workers.dev

## 1. Set up on another device

Install **Node.js 22.13 or newer** and npm. Install Git if you plan to clone a repository.

Copy the project folder to the new device, or clone your repository if you have uploaded the code to one. Keep the source files, `package.json`, `package-lock.json`, and configuration files, including `.openai/hosting.json` and `.npmrc`.

You do not need to copy `node_modules`, `dist`, `.wrangler`, `.sites-runtime`, or `.git` when transferring a plain source folder. Dependencies and build output are recreated locally.

Open a terminal inside the copied project:

```sh
cd Ayush_Web
npm ci
npm run dev
```

Open the URL printed in the terminal, normally **http://localhost:5173**. Stop the server with **Ctrl+C**.

No API keys, database setup, or Cloudflare login are needed to run the demo locally. The simulation starts from the same seed on each fresh page load.

## 2. Main files and their functions

| File / folder | What it does |
| --- | --- |
| `app/page.tsx` | Main dashboard: navigation, dataset selection, portfolio summary, and simulation play/pause. |
| `app/layout.tsx` | Shared page shell, document title, description, favicon, and global stylesheet import. |
| `app/globals.css` | Colors, typography, layout, responsive rules, mobile cards, and reduced-motion styles. |
| `components/Explorer.tsx` | Main interactive workspace: filters, dates, chart choices, comparisons, details, insights, and CSV export. |
| `components/charts/Chart.tsx` | Loads and renders ECharts, resizes charts, handles clicks, and loads map geometry. |
| `components/network/NetworkGraph.tsx` | D3 relationship graph with dragging, zooming, panning, selection, and layout reset. |
| `components/ui/` | Reusable interface controls such as tabs, selects, sliders, sheets, and tables. |
| `types/market.ts` | Shared TypeScript definitions for assets, prices, relationships, transactions, and insights. |
| `lib/data-generator.ts` | Generates reproducible price histories and applies simulated market updates. |
| `lib/market-source.ts` | Data-source adapter: provides the initial snapshot and four-second update subscription. |
| `lib/analytics.ts` | Calculates returns, volatility, correlations, portfolio statistics, allocations, and insight text. |
| `lib/transformations.ts` | Converts processed data and explorer settings into chart configurations. |
| `public/data/world.geojson` | Real Natural Earth country boundaries for the geographic view. |
| `public/favicon.svg` | Browser-tab icon. |
| `tests/analytics.test.ts` | Checks simulation consistency, financial calculations, edge cases, and chart rendering. |
| `scripts/test-analytics.mjs` | Bundles and runs the analytics tests. |
| `scripts/run-framework.mjs` | Starts the project’s development or production build workflow. |
| `vite.config.ts` | Connects Vinext, Cloudflare’s Vite plugin, and the Sites build helper. |
| `next.config.ts` | Next.js-compatible framework settings. |
| `wrangler.cloudflare.jsonc` | Direct Cloudflare deployment target, account, Worker entry point, assets, and observability. |
| `types/cloudflare-deployment.d.ts` | Generated deployment types; regenerate with Wrangler when configuration changes. |
| `package.json` / `package-lock.json` | Commands, dependencies, and exact installed dependency versions. |
| `.openai/hosting.json` / `build/sites-vite-plugin.ts` | Configuration and build support for the separate Sites hosting integration. |
| `README.md` | More detailed architecture, simulation assumptions, and validation limitations. |

`db/`, `drizzle/`, and `app/chatgpt-auth.ts` are starter infrastructure; the current dashboard does not require a database or application login.

## 3. How data reaches the screen

```text
Seeded generator → MarketSource subscription → Analytics calculations
                → Chart transformations → Charts / network → Explorer UI
```

To connect a real API later, implement the `MarketSource` interface in `lib/market-source.ts`, providing `initial()` and `subscribe()`. Keep its snapshots compatible with `types/market.ts` so the visualizations can reuse them.

## 4. Everyday commands

Run these from the project root:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile on a fresh device. |
| `npm run dev` | Start local development with automatic updates after edits. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run analytics and chart-rendering checks. |
| `npm run build` | Generate production output in `dist/`. |
| `npm start` | Serve the built app locally through Wrangler; run the build first. |
| `npm run deploy:cloudflare:check` | Build and validate the deployment without publishing. |
| `npm run deploy:cloudflare` | Build and publish to the configured Cloudflare Worker. |

Recommended checks before publishing:

```sh
npm run typecheck
npm test
npm run deploy:cloudflare:check
```

## 5. Deploy from another device

Authenticate using a Cloudflare user that has access to **Syncqtech@gmail.com’s Account**:

```sh
npx wrangler login
npx wrangler whoami
npm run deploy:cloudflare
```

Complete the browser login and verify that `whoami` lists the intended account before deploying.

The current configuration targets:

- **Worker:** `folio-analytics`
- **Account:** Syncqtech@gmail.com’s Account
- **Public URL:** https://folio-analytics.syncqtech.workers.dev

Deploying again updates this same Worker. To deploy a separate copy, change `name` in `wrangler.cloudflare.jsonc` to an unused Worker name. For a different account, also update `account_id` using the account shown by `wrangler whoami`.

Edit the source configuration, not generated files inside `dist/`. Keep Cloudflare credentials outside the repository. The existing private Sites URL is a separate deployment and is not updated by this command.

## 6. Where to make common changes

- **Change branding, spacing, or mobile layout:** `app/page.tsx`, `app/layout.tsx`, and `app/globals.css`.
- **Add assets or adjust synthetic market behavior:** `lib/data-generator.ts`.
- **Change update frequency:** the `interval` parameter in `createSimulationSource()` in `lib/market-source.ts`.
- **Change financial formulas or insights:** `lib/analytics.ts`.
- **Change chart appearance or data mapping:** `lib/transformations.ts`.
- **Change graph behavior:** `components/network/NetworkGraph.tsx`.
- **Add explorer controls:** `components/Explorer.tsx`.

## 7. Troubleshooting and demo notes

- **Missing dependencies:** run `npm ci` in the project root.
- **Node version errors:** check `node --version`; the project requires at least 22.13.
- **Local URL differs:** use the URL printed by the server rather than assuming a port.
- **Production preview fails:** run `npm run build` before `npm start`.
- **Cloudflare permission errors:** run `npx wrangler whoami` and verify account access.
- **Compatibility date rejected as future:** Cloudflare checks the current UTC date.
- **Stable presentation needed:** pause the simulation using the dashboard button.

All market values are simulated, not live quotes. Updates modify the last simulated trading session. Automated chart checks cover several screen widths, but they do not replace browser, phone, and touch testing.
