import assert from "node:assert/strict";
import { generate, advance } from "../lib/data-generator";
import {
  enrich,
  correlation,
  relationships,
  insights,
  allocations,
} from "../lib/analytics";
import { chartOption, views, type ChartSettings } from "../lib/transformations";
import * as echarts from "echarts";
import { readFileSync } from "node:fs";
const seed = generate(42);
assert.deepEqual(seed, generate(42), "seed is reproducible");
assert.notDeepEqual(seed, generate(43));
assert.equal(seed.assets.length, 30);
assert.ok(
  Math.abs(seed.assets.reduce((s, a) => s + a.weight, 0) - 100) < 1e-10,
);
for (const a of seed.assets) {
  assert.equal(a.history.length, 780);
  for (const p of a.history) {
    assert.ok(p.low <= Math.min(p.open, p.close));
    assert.ok(p.high >= Math.max(p.open, p.close));
    assert.ok(p.close > 0 && p.volume > 0);
    assert.ok(![0, 6].includes(new Date(p.date).getUTCDay()));
  }
}
const updated = advance(seed);
assert.equal(updated.tick, 1);
assert.notEqual(updated.assets[0].price, seed.assets[0].price);
assert.notEqual(updated.transactions[0].amount, seed.transactions[0].amount);
assert.deepEqual(seed, generate(42), "update does not mutate input");
const assets = enrich(seed.assets);
assert.ok(Math.abs(correlation(assets[0], assets[0]) - 1) < 1e-9);
assert.ok(
  Math.abs(
    correlation(assets[0], assets[1]) - correlation(assets[1], assets[0]),
  ) < 1e-9,
);
assert.equal(relationships(assets).length, 435);
const same = relationships(assets).filter(
  (r) =>
    assets.find((a) => a.ticker === r.source)!.sector ===
    assets.find((a) => a.ticker === r.target)!.sector,
);
const different = relationships(assets).filter(
  (r) =>
    assets.find((a) => a.ticker === r.source)!.sector !==
    assets.find((a) => a.ticker === r.target)!.sector,
);
assert.ok(
  same.reduce((s, r) => s + r.strength, 0) / same.length >
    different.reduce((s, r) => s + r.strength, 0) / different.length,
  "sector relationships are stronger on average",
);
assert.equal(insights(assets).length, 3);
assert.deepEqual(insights([]), []);
assert.equal(allocations(assets).length, 5);
assert.ok(enrich(seed.assets, "2025-01-15")[0].history.length < 780);
assert.notEqual(enrich(seed.assets, "2025-01-15")[0].price, assets[0].price);
echarts.registerMap(
  "world",
  JSON.parse(readFileSync("public/data/world.geojson", "utf8")),
);
const settings: ChartSettings = {
  view: "Performance",
  range: "1Y",
  metric: "Cumulative return",
  selected: "Portfolio",
  compare: "NVDA",
  style: "Area",
  size: "Portfolio weight",
  color: "Daily return",
  sort: "Descending",
  trend: true,
  distribution: "Daily returns",
  allocation: "Donut",
  dataset: "Portfolio",
};
let renders = 0;
for (const view of views.filter((v) => v !== "Network")) {
  for (const width of [320, 375, 390, 430, 1100]) {
    const chart = echarts.init(null, undefined, {
      renderer: "svg",
      ssr: true,
      width,
      height: 355,
    });
    const option = chartOption(assets, seed.transactions, {
      ...settings,
      view,
      ...(view === "Candlestick"
        ? { style: "Candlestick", selected: "NVDA", metric: "Price" }
        : {}),
    });
    chart.setOption({ ...option, animation: false });
    const svg = chart.renderToSVGString();
    assert.ok(svg.includes("<svg"));
    assert.ok(!svg.includes("NaN"), "no invalid coordinates for " + view);
    assert.ok(!svg.includes("Infinity"));
    chart.dispose();
    renders++;
  }
}
for (const subset of [assets.slice(0, 1), []])
  for (const view of views) {
    assert.doesNotThrow(() =>
      chartOption(subset, seed.transactions, { ...settings, view }),
    );
  }
for (const allocation of ["Stacked bar", "Donut"])
  assert.ok(
    chartOption(assets, seed.transactions, {
      ...settings,
      view: "Allocation",
      allocation,
    }).series,
  );
for (const style of ["Histogram", "Box plot"])
  assert.ok(
    chartOption(assets, seed.transactions, {
      ...settings,
      view: "Distribution",
      style,
    }).series,
  );
const first = chartOption(assets, seed.transactions, settings);
const next = chartOption(
  enrich(updated.assets),
  updated.transactions,
  settings,
);
assert.notDeepEqual(
  first.series,
  next.series,
  "chart changes on simulation ticks",
);
console.log(
  `Passed: deterministic generation, financial invariants, immutable updates, relationship structure, date filtering, insights, edge cases, and ${renders} SVG chart renders at five viewport widths.`,
);
