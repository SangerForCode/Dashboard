"use client";
import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import {
  Search,
  ArrowUpRight,
  Info,
  Maximize2,
  Minimize2,
  Download,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  enrich,
  insights,
  relationships,
  allocations,
  mean,
  money,
  pct,
} from "@/lib/analytics";
import { colors, sectors } from "@/lib/data-generator";
import {
  chartOption,
  views,
  ranges,
  explanations,
  type View,
  type ChartMetric,
} from "@/lib/transformations";
import type { MarketSnapshot, Asset } from "@/types/market";
import type { ChartClick } from "./charts/Chart";
import BorderGlow from "@/components/BorderGlow";
const Chart = lazy(() => import("./charts/Chart"));
const NetworkGraph = lazy(() => import("./network/NetworkGraph"));
function Picker({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  label: string;
}) {
  return (
    <div className="picker">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((x) => (
            <SelectItem key={x} value={x}>
              {x}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export default function Explorer({
  snapshot,
  view,
  onViewChange,
}: {
  snapshot: MarketSnapshot;
  view: View;
  onViewChange: (view: View) => void;
}) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);
  const setView = onViewChange;
  const [metric, setMetric] = useState<ChartMetric>("Cumulative return");
  const [range, setRange] = useState("1Y");
  const [sector, setSector] = useState("All sectors");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(snapshot.assets[0].history.at(-1)!.date);
  const [selected, setSelected] = useState("Portfolio");
  const [compare, setCompare] = useState("None");
  const [style, setStyle] = useState("Area");
  const [size, setSize] = useState("Portfolio weight");
  const [color, setColor] = useState("Daily return");
  const [sort, setSort] = useState("Descending");
  const [trend, setTrend] = useState(false);
  const [distribution, setDistribution] = useState("Daily returns");
  const [allocation, setAllocation] = useState("Donut");
  const [threshold, setThreshold] = useState(0.52);
  const [flowSource, setFlowSource] = useState("Transactions");
  const [detail, setDetail] = useState("");
  const [sheet, setSheet] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(
    () => enrich(snapshot.assets, date),
    [snapshot.assets, date],
  );
  const assets = useMemo(
    () =>
      all.filter(
        (a) =>
          (sector === "All sectors" || a.sector === sector) &&
          (!search ||
            `${a.name} ${a.ticker} ${a.sector}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [all, sector, search],
  );
  const ideas = useMemo(() => insights(assets), [assets]);
  const connections = useMemo(() => relationships(assets), [assets]);
  const chosen = all.find((a) => a.ticker === selected);
  useEffect(() => {
    setDetail("");
    if (view === "Candlestick") {
      setStyle("Candlestick");
      setMetric("Price");
      if (selected === "Portfolio")
        setSelected(assets[0]?.ticker || "Portfolio");
    } else if (view === "Distribution") setStyle("Histogram");
    else if (view === "Performance") {
      setStyle("Area");
      setMetric("Cumulative return");
    } else if (view === "Risk & return") setMetric("Volatility");
    else if (view === "Sector bars") setMetric("Monthly return");
  }, [view]);
  useEffect(() => {
    if (selected !== "Portfolio" && !assets.some((a) => a.ticker === selected))
      setSelected("Portfolio");
    if (compare !== "None" && !assets.some((a) => a.ticker === compare))
      setCompare("None");
  }, [assets, selected, compare]);
  useEffect(() => {
    const doc = document as Document & {
      modelContext?: {
        registerTool: (
          tool: {
            name: string;
            description: string;
            inputSchema: object;
            annotations: object;
            execute: (input: unknown) => unknown;
          },
          options: { signal: AbortSignal },
        ) => void | Promise<void>;
      };
    };
    if (!doc.modelContext) return;
    const controller = new AbortController();
    Promise.resolve(
      doc.modelContext.registerTool(
        {
          name: "configure_financial_explorer",
          description:
            "Choose a visualization and sector filter in the visible Folio explorer.",
          inputSchema: {
            type: "object",
            properties: {
              visualization: { type: "string", enum: views },
              sector: { type: "string", enum: ["All sectors", ...sectors] },
            },
            required: ["visualization", "sector"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: unknown) => {
            if (!input || typeof input !== "object")
              throw Error("Expected an object");
            const v = input as Record<string, unknown>;
            if (
              !views.includes(v.visualization as View) ||
              !["All sectors", ...sectors].includes(String(v.sector))
            )
              throw Error("Invalid visualization or sector");
            setView(v.visualization as View);
            setSector(String(v.sector));
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            );
            return { visualization: v.visualization, sector: v.sector };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, []);
  const option = useMemo(
    () =>
      chartOption(assets, snapshot.transactions, {
        view,
        range,
        metric,
        selected,
        compare,
        style,
        size,
        color,
        sort,
        trend,
        distribution,
        allocation,
        dataset: flowSource,
      }, isDark),
    [
      assets,
      snapshot.transactions,
      view,
      range,
      metric,
      selected,
      compare,
      style,
      size,
      color,
      sort,
      trend,
      distribution,
      allocation,
      flowSource,
      isDark,
    ],
  );
  function selectAsset(ticker: string) {
    setSelected(ticker);
    if (matchMedia("(max-width: 767px)").matches) setSheet(true);
  }
  function chartClick(e: ChartClick) {
    const name = e.name || "";
    if (all.some((a) => a.ticker === name)) {
      selectAsset(name);
      return;
    }
    if (e.seriesType === "heatmap" && Array.isArray(e.value)) {
      const value = Number(e.value[2]);
      setDetail(
        view === "Correlation"
          ? `${name}: ${value > 0.6 ? "These assets have usually moved in the same direction." : value < 0 ? "These assets have often moved in opposite directions." : "These assets have a limited shared movement pattern."} Relationship score: ${value.toFixed(2)}.`
          : `${name}: ${pct(value)} for the month.`,
      );
    } else if (e.seriesType === "sankey") {
      const d = e.data as { source?: string; target?: string; value?: number };
      setDetail(
        d.source
          ? `${money(d.value || 0)} flows from ${d.source} to ${d.target}.`
          : `${name} is part of this allocation. Tap a connecting flow to see the amount.`,
      );
    } else if (sectors.includes(name)) {
      setSector(name);
      setDetail(
        `${name} accounts for ${allocations(all)
          .find((g) => g.name === name)
          ?.value.toFixed(1)}% of your portfolio.`,
      );
    } else if (e.seriesType === "scatter" && view === "Geography") {
      const values = e.value as number[];
      setDetail(
        `${name} is home to ${assets.filter((a) => a.country === name).length} companies, representing ${values[2].toFixed(1)}% of your original investment.`,
      );
    }
  }
  function download() {
    const rows = [
      "ticker,company,sector,price_inr,daily_return_pct,monthly_return_pct,weight_pct",
      ...assets.map((a) =>
        [
          a.ticker,
          a.name,
          a.sector,
          a.price.toFixed(2),
          a.daily.toFixed(3),
          a.monthly.toFixed(3),
          a.weight.toFixed(3),
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "folio-simulation.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const details = chosen ? (
    <>
      <div
        className="detail-symbol"
        style={{
          background: colors[chosen.sector] + "19",
          color: colors[chosen.sector],
        }}
      >
        {chosen.ticker.slice(0, 2)}
      </div>
      <h3>{chosen.name}</h3>
      <p className="detail-sector">
        {chosen.ticker} · {chosen.sector}
      </p>
      <strong className="detail-price">{money(chosen.price)}</strong>
      <span className={chosen.daily >= 0 ? "positive" : "negative"}>
        {pct(chosen.daily)} today
      </span>
      <dl>
        <div>
          <dt>Monthly return</dt>
          <dd>{pct(chosen.monthly)}</dd>
        </div>
        <div>
          <dt>Market cap</dt>
          <dd>₹{(chosen.marketCap / 1e12).toFixed(2)}T</dd>
        </div>
        <div>
          <dt>Portfolio allocation</dt>
          <dd>{chosen.weight.toFixed(2)}%</dd>
        </div>
        <div>
          <dt>Typical yearly movement</dt>
          <dd>{chosen.volatility.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Quality / value score</dt>
          <dd>
            {chosen.quality} / {chosen.value}
          </dd>
        </div>
      </dl>
      <h4>Closest connections</h4>
      <p className="detail-help">
        These companies have moved most similarly over the last 60 observations.
      </p>
      {connections
        .filter((l) => l.source === chosen.ticker || l.target === chosen.ticker)
        .slice(0, 3)
        .map((l) => {
          const ticker = l.source === chosen.ticker ? l.target : l.source;
          return (
            <button
              className="connection"
              key={ticker}
              onClick={() => setSelected(ticker)}
            >
              <b>{ticker}</b>
              <span>
                {l.strength.toFixed(2)} <ChevronRight size={14} />
              </span>
            </button>
          );
        })}
      <button
        className="clear-selection"
        onClick={() => {
          setSelected("Portfolio");
          setSheet(false);
        }}
      >
        Clear selection
      </button>
    </>
  ) : null;
  const sorted = [...assets].sort((a, b) =>
    sort === "Ascending" ? a.daily - b.daily : b.daily - a.daily,
  );
  const vals = assets
    .map((a) =>
      distribution === "Daily returns"
        ? a.daily
        : distribution === "Volatility"
          ? a.volatility
          : a.monthly,
    )
    .sort((a, b) => a - b);
  const q = (p: number) => vals[Math.floor((vals.length - 1) * p)] || 0;
  return (
    <>
      <BorderGlow
        className="analytics-glow-frame"
        glowColor="222 86 76"
        backgroundColor="transparent"
        borderRadius={10}
        glowRadius={24}
        glowIntensity={0.48}
        coneSpread={20}
        colors={["#79a7ff", "#6677e8", "#56c6ac"]}
        fillOpacity={0.16}
      >
        <section
          id="visualization"
          className={"panel explorer " + (expanded ? "expanded" : "")}
          aria-label="Data explorer"
        >
        <div className="panel-heading">
          <h2>{view}</h2>
          <div className="panel-actions">
            <button
              onClick={download}
              aria-label="Download filtered data as CSV"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              aria-label={
                expanded ? "Collapse visualization" : "Expand visualization"
              }
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        <div className="explorer-controls">
          {["Performance", "Sector bars", "Risk & return"].includes(
            view,
          ) && (
            <Picker
              label={
                view === "Risk & return" ? "Horizontal axis" : "Metric"
              }
              value={metric}
              onChange={(v) => {
                setMetric(v as ChartMetric);
                if (v === "Price" && selected === "Portfolio")
                  setSelected(assets[0]?.ticker || "Portfolio");
              }}
              items={
                view === "Performance"
                  ? [
                      "Cumulative return",
                      "Price",
                      "Portfolio value",
                      "Volume",
                      "Volatility",
                    ]
                  : view === "Risk & return"
                    ? ["Volatility", "Momentum", "Volume", "Market cap"]
                    : [
                        "Monthly return",
                        "Momentum",
                        "Risk",
                        "Volume",
                        "Volatility",
                      ]
              }
            />
          )}
          <Picker
            label="Sector"
            value={sector}
            onChange={setSector}
            items={["All sectors", ...sectors]}
          />
          <label className="date-filter">
            As of
            <input
              type="date"
              aria-label="As of date"
              min={snapshot.assets[0].history[1].date}
              max={snapshot.assets[0].history.at(-1)!.date}
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <label className="search-filter">
            <Search size={15} />
            <input
              aria-label="Search assets"
              placeholder="Find an asset…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <div className="chart-toolbar">
          {["Performance", "Candlestick"].includes(view) ? (
            <>
              <Tabs value={range} onValueChange={setRange}>
                <TabsList>
                  {Object.keys(ranges).map((r) => (
                    <TabsTrigger key={r} value={r}>
                      {r}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="toolbar-pickers">
                <Picker
                  label="Asset"
                  value={selected}
                  onChange={setSelected}
                  items={
                    view === "Candlestick"
                      ? assets.map((a) => a.ticker)
                      : ["Portfolio", ...assets.map((a) => a.ticker)]
                  }
                />
                {view === "Performance" && (
                  <Picker
                    label="Compare"
                    value={compare}
                    onChange={(v) => {
                      setCompare(v);
                      if (v !== "None") setMetric("Cumulative return");
                    }}
                    items={["None", ...assets.map((a) => a.ticker)]}
                  />
                )}
                <Picker
                  label="Style"
                  value={style}
                  onChange={setStyle}
                  items={
                    view === "Candlestick"
                      ? ["Candlestick", "Line", "Area"]
                      : ["Area", "Line"]
                  }
                />
              </div>
            </>
          ) : view === "Network" ? (
            <>
              <span className="toolbar-caption">
                {assets.length} companies ·{" "}
                {connections.filter((l) => l.strength >= threshold).length}{" "}
                relationships
              </span>
              <div className="threshold">
                <label>Relationship strength ≥ {threshold.toFixed(2)}</label>
                <Slider
                  aria-label="Minimum relationship strength"
                  min={0.2}
                  max={0.85}
                  step={0.05}
                  value={[threshold]}
                  onValueChange={(v) => setThreshold(v[0])}
                />
              </div>
            </>
          ) : view === "Treemap" ? (
            <>
              <Picker
                label="Size by"
                value={size}
                onChange={setSize}
                items={["Portfolio weight", "Market cap", "Volume"]}
              />
              <Picker
                label="Color by"
                value={color}
                onChange={setColor}
                items={["Daily return", "Monthly return", "Volatility"]}
              />
            </>
          ) : view === "Distribution" ? (
            <>
              <Picker
                label="Measure"
                value={distribution}
                onChange={setDistribution}
                items={["Daily returns", "Monthly returns", "Volatility"]}
              />
              <Picker
                label="Chart"
                value={style}
                onChange={setStyle}
                items={["Histogram", "Box plot"]}
              />
            </>
          ) : view === "Risk & return" ? (
            <label className="switch-label">
              <Switch checked={trend} onCheckedChange={setTrend} />
              Show overall trend
            </label>
          ) : ["Sector bars", "Correlation"].includes(view) ? (
            <Picker
              label="Sort"
              value={sort}
              onChange={setSort}
              items={["Descending", "Ascending"]}
            />
          ) : view === "Money flow" ? (
            <>
              <span className="toolbar-caption">Tap any flow to explore</span>
              <Picker
                label="Flow source"
                value={flowSource}
                onChange={setFlowSource}
                items={["Transactions", "Allocation"]}
              />
            </>
          ) : (
            <span className="toolbar-caption">
              Tap any {view === "Hierarchy" ? "branch" : "segment"} to explore
            </span>
          )}
          {view === "Allocation" && (
            <Picker
              label="Show allocation as"
              value={allocation}
              onChange={setAllocation}
              items={["Donut", "Stacked bar"]}
            />
          )}
        </div>
        {assets.length ? (
          <>
            <div
              className={
                "visualization-layout " + (chosen ? "with-detail" : "")
              }
            >
              <div className="visualization">
                <Suspense
                  fallback={
                    <div className="loading">Loading visualization…</div>
                  }
                >
                  {view === "Network" ? (
                    <NetworkGraph
                      assets={assets}
                      selected={selected}
                      onSelect={selectAsset}
                      threshold={threshold}
                      isDark={isDark}
                    />
                  ) : view === "Hierarchy" ? (
                    <div className="tree-layout">
                      <Chart option={option} onClick={chartClick} isDark={isDark} />
                      <div className="mobile-tree">
                        <button onClick={() => setSector("All sectors")}>
                          Portfolio · {assets.length} assets
                        </button>
                        {allocations(assets).map((g) => (
                          <details key={g.name} open={!!search || undefined}>
                            <summary>
                              <span style={{ background: colors[g.name] }} />
                              {g.name}
                              <b>{g.value.toFixed(1)}%</b>
                            </summary>
                            {assets
                              .filter((a) => a.sector === g.name)
                              .map((a) => (
                                <button
                                  key={a.ticker}
                                  onClick={() => selectAsset(a.ticker)}
                                >
                                  {a.name}
                                  <span>{a.ticker} →</span>
                                </button>
                              ))}
                          </details>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Chart
                      option={option}
                      onClick={chartClick}
                      map={view === "Geography"}
                      isDark={isDark}
                    />
                  )}
                </Suspense>
              </div>
              {chosen && <aside className="asset-detail">{details}</aside>}
            </div>
            <div className="chart-legend">
              {[
                "Network",
                "Allocation",
                "Risk & return",
                "Sector bars",
              ].includes(view) ? (
                allocations(assets).map((g) => (
                  <button
                    key={g.name}
                    onClick={() =>
                      setSector(sector === g.name ? "All sectors" : g.name)
                    }
                  >
                    <span style={{ background: colors[g.name] }} />
                    {g.name}
                    <b>{g.value.toFixed(1)}%</b>
                  </button>
                ))
              ) : (
                <span>
                  {view === "Geography"
                    ? "Natural Earth boundaries · Country-level headquarters locations"
                    : view === "Correlation"
                      ? `Showing ${Math.min(14, assets.length)} assets · Filter or search to focus the matrix`
                      : view === "Monthly heatmap"
                        ? `Showing ${Math.min(10, assets.length)} assets · Search to focus a company`
                        : `${assets.length} assets in selection · ${date}`}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="empty">
            <Search size={26} />
            <h3>No matching assets</h3>
            <p>Try another company name or broaden your sector filter.</p>
            <button
              onClick={() => {
                setSearch("");
                setSector("All sectors");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="chart-explanation">
          <Info size={16} />
          <div>
            <b>How to read this</b>
            <p>
              {detail || explanations[view][1]}
              {view === "Distribution" &&
                assets.length > 0 &&
                ` Median: ${q(0.5).toFixed(2)}%. The middle half lies between ${q(0.25).toFixed(2)}% and ${q(0.75).toFixed(2)}%.`}
            </p>
          </div>
        </div>
        </section>
      </BorderGlow>
      <div className="bottom-grid">
        {ideas.map((i, n) => (
          <article className="insight-card" key={i.title}>
            <span className="insight-number">0{n + 1} / INSIGHT</span>
            <h3>{i.title}</h3>
            <p>{i.text}</p>
          </article>
        ))}
      </div>
      <section className="asset-section">
        <div className="section-heading">
          <div>
            <h2>
              Your underlying assets <span>{assets.length}</span>
            </h2>
            <p>The numbers behind every visualization.</p>
          </div>
          <Picker
            label="Daily return"
            value={sort}
            onChange={setSort}
            items={["Descending", "Ascending"]}
          />
        </div>
        <div className="desktop-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>1 month</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>
                  <span className="sr-only">Explore</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(showAll ? sorted : sorted.slice(0, 6)).map((a) => (
                <TableRow
                  key={a.ticker}
                  className={selected === a.ticker ? "selected-row" : ""}
                >
                  <TableCell>
                    <button
                      className="company-cell"
                      onClick={() => selectAsset(a.ticker)}
                    >
                      <span
                        style={{
                          background: colors[a.sector] + "18",
                          color: colors[a.sector],
                        }}
                      >
                        {a.ticker.slice(0, 2)}
                      </span>
                      <div>
                        <b>{a.name}</b>
                        <small>{a.ticker}</small>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>{money(a.price)}</TableCell>
                  <TableCell className={a.daily >= 0 ? "positive" : "negative"}>
                    {pct(a.daily)}
                  </TableCell>
                  <TableCell
                    className={a.monthly >= 0 ? "positive" : "negative"}
                  >
                    {pct(a.monthly)}
                  </TableCell>
                  <TableCell>
                    {a.weight.toFixed(1)}%
                    <div className="weight-track">
                      <i
                        style={{
                          width: a.weight * 10 + "%",
                          background: colors[a.sector],
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="sector-label">{a.sector}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => selectAsset(a.ticker)}
                      aria-label={"Explore " + a.name}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mobile-assets">
          {(showAll ? sorted : sorted.slice(0, 6)).map((a) => (
            <button
              className="asset-card"
              key={a.ticker}
              onClick={() => selectAsset(a.ticker)}
            >
              <div>
                <b>{a.name}</b>
                <span>
                  {a.ticker} · {a.sector}
                </span>
              </div>
              <div>
                <b>{money(a.price)}</b>
                <span className={a.daily >= 0 ? "positive" : "negative"}>
                  {pct(a.daily)} today
                </span>
              </div>
            </button>
          ))}
        </div>
        {assets.length > 6 && (
          <button className="show-all" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show fewer assets" : `View all ${assets.length} assets`}
            <ChevronRight size={14} />
          </button>
        )}
      </section>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="detail-sheet">
          <SheetHeader>
            <SheetTitle>Asset details</SheetTitle>
            <SheetDescription>
              Simulated prices and calculated relationships.
            </SheetDescription>
          </SheetHeader>
          <div>{details}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
