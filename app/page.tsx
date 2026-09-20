"use client";
import { Fragment, useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChartCandlestick,
  ChartColumn,
  ChartNoAxesColumn,
  ChartNoAxesCombined,
  ChartPie,
  ChartScatter,
  ChevronRight,
  Globe,
  Grid3x3,
  LayoutGrid,
  ListTree,
  Network,
  Pause,
  Play,
  Sparkles,
  TrendingUp,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import Explorer from "@/components/Explorer";
import { createSimulationSource } from "@/lib/market-source";
import {
  enrich,
  allocations,
  insights,
  money,
  pct,
  portfolioStats,
} from "@/lib/analytics";
import { explanations, type View } from "@/lib/transformations";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/SpotlightCard";
// Every visualization the app can render, grouped by the question it answers.
// This is the single source of navigation truth: the desktop sidebar and the
// mobile tab strip both read it, so no view can gain a duplicate entry.
const navGroups: {
  label: string;
  items: { view: View; label: string; short: string; Icon: LucideIcon }[];
}[] = [
  {
    label: "Trends",
    items: [
      {
        view: "Performance",
        label: "Performance",
        short: "Perf",
        Icon: TrendingUp,
      },
      {
        view: "Candlestick",
        label: "Candlestick",
        short: "Candles",
        Icon: ChartCandlestick,
      },
      {
        view: "Monthly heatmap",
        label: "Monthly returns",
        short: "Monthly",
        Icon: CalendarDays,
      },
    ],
  },
  {
    label: "Composition",
    items: [
      {
        view: "Allocation",
        label: "Allocation",
        short: "Alloc",
        Icon: ChartPie,
      },
      { view: "Treemap", label: "Treemap", short: "Treemap", Icon: LayoutGrid },
      { view: "Hierarchy", label: "Hierarchy", short: "Tree", Icon: ListTree },
      {
        view: "Sector bars",
        label: "Sector bars",
        short: "Sectors",
        Icon: ChartColumn,
      },
    ],
  },
  {
    label: "Risk & links",
    items: [
      {
        view: "Risk & return",
        label: "Risk vs return",
        short: "Risk",
        Icon: ChartScatter,
      },
      {
        view: "Distribution",
        label: "Distribution",
        short: "Spread",
        Icon: ChartNoAxesColumn,
      },
      {
        view: "Correlation",
        label: "Correlation",
        short: "Corr",
        Icon: Grid3x3,
      },
      { view: "Network", label: "Network", short: "Links", Icon: Network },
    ],
  },
  {
    label: "Flow & place",
    items: [
      {
        view: "Money flow",
        label: "Money flow",
        short: "Flow",
        Icon: Waypoints,
      },
      { view: "Geography", label: "Geography", short: "Map", Icon: Globe },
    ],
  },
];
const navItems = navGroups.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label })),
);
const smoothly = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? ("auto" as const)
    : ("smooth" as const);
export default function Home() {
  const [source] = useState(() => createSimulationSource());
  const [snapshot, setSnapshot] = useState(() => source.initial());
  const [live, setLive] = useState(true);
  const [view, setView] = useState<View>("Performance");
  const strip = useRef<HTMLElement>(null);
  const assets = useMemo(() => enrich(snapshot.assets), [snapshot]);
  const ideas = useMemo(() => insights(assets), [assets]);
  const stats = useMemo(() => portfolioStats(assets), [assets]);
  const value = stats.value;
  const active = navItems.find((i) => i.view === view) ?? navItems[0];
  useEffect(() => {
    if (!live) return;
    return source.subscribe(setSnapshot);
  }, [live, source]);
  // Keep the active mobile chip in sight without moving the page itself.
  useEffect(() => {
    const bar = strip.current;
    const chip = bar?.querySelector<HTMLElement>('[data-active="true"]');
    if (!bar || !chip || !bar.clientWidth) return;
    bar.scrollTo({
      left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2,
      behavior: smoothly(),
    });
  }, [view]);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let graph: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    const paintGlow = () => {
      frame = 0;
      if (!graph) return;
      const bounds = graph.getBoundingClientRect();
      graph.style.setProperty("--graph-glow-x", `${x - bounds.left}px`);
      graph.style.setProperty("--graph-glow-y", `${y - bounds.top}px`);
    };
    const followPointer = (event: PointerEvent) => {
      if (reducedMotion.matches || event.pointerType === "touch") return;
      const target = event.target;
      graph = target instanceof Element
        ? target.closest<HTMLElement>(".chart-wrap, .network-wrap")
        : null;
      if (!graph) return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paintGlow);
    };
    window.addEventListener("pointermove", followPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", followPointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  // Switch the view and bring the chart into sight, unless it already is.
  function show(next: View) {
    setView(next);
    const panel = document.getElementById("visualization");
    if (!panel) return;
    const { top } = panel.getBoundingClientRect();
    if (top < 56 || top > 220)
      panel.scrollIntoView({ behavior: smoothly(), block: "start" });
  }
  return (
    <SidebarProvider>
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <span className="brand-mark">
              <ChartNoAxesCombined size={19} />
            </span>
            folio<span className="brand-dot">.</span>
          </a>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group) => (
            <Fragment key={group.label}>
              <p className="nav-label">{group.label.toUpperCase()}</p>
              <SidebarMenu>
                {group.items.map(({ view: item, label, Icon }) => (
                  <SidebarMenuItem key={item}>
                    <SidebarMenuButton
                      isActive={view === item}
                      onClick={() => show(item)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {view === item && <span className="nav-indicator" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </Fragment>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="simulation-label">
            <span />
            Simulated market data
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-main">
        <header className="topbar">
          <div>
            <span>Visualizations</span>
            <ChevronRight size={14} />
            <b>{active.label}</b>
          </div>
          <span className="topbar-right">
            <span className="demo-tag">DEMO</span>All values in INR{" "}
            <ThemeToggle />
            <span className="avatar">AS</span>
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">{active.group.toUpperCase()}</div>
              <h1>{explanations[view][0]}</h1>
            </div>
            <button
              className={"live-button " + (!live ? "paused" : "")}
              onClick={() => setLive(!live)}
            >
              {live ? <Pause size={14} /> : <Play size={14} />}{" "}
              {live ? "Simulation live" : "Simulation paused"}
              <span className="live-dot" />
            </button>
          </div>
          <div className="metrics">
            <div>
              <span>Portfolio value</span>
              <strong>{money(value)}</strong>
              <small className="positive">
                ↗ {pct(stats.daily)} <em>today</em>
              </small>
            </div>
            <div>
              <span>Total return</span>
              <strong>{pct((value / 1e6 - 1) * 100)}</strong>
              <small>Since simulation inception</small>
            </div>
            <div>
              <span>Portfolio risk</span>
              <strong>
                {stats.volatility.toFixed(1)}
                <i>%</i>
              </strong>
              <small>
                <span className="risk-dot" /> Typical annual movement
              </small>
            </div>
            <div>
              <span>Largest allocation</span>
              <strong>
                {allocations(assets)[0].value.toFixed(1)}
                <i>%</i>
              </strong>
              <small>
                <span className="sector-dot" />
                {allocations(assets)[0].name}
              </small>
            </div>
          </div>
          <Explorer snapshot={snapshot} view={view} onViewChange={setView} />
          <SpotlightCard
            className="insight-spotlight"
            spotlightColor="rgba(121, 167, 255, 0.16)"
          >
            <div className="insight-strip">
              <Sparkles size={20} />
              <div>
                <b>A connection worth exploring</b>
                <p>{ideas[2]?.text}</p>
              </div>
              <button
                onClick={() => show("Network")}
                aria-label="Explore relationships"
              >
                <ArrowUpRight size={20} />
              </button>
            </div>
          </SpotlightCard>
          <footer>
            Built for understanding.{" "}
            <span>Reproducible simulation · Not live market prices</span>
          </footer>
        </main>
        <nav className="viz-tabs" aria-label="Visualizations" ref={strip}>
          {navGroups.map((group, index) => (
            <Fragment key={group.label}>
              {index > 0 && <span className="viz-divider" aria-hidden="true" />}
              {group.items.map(({ view: item, label, short, Icon }) => (
                <button
                  key={item}
                  className="viz-chip"
                  data-active={view === item}
                  aria-current={view === item ? "page" : undefined}
                  aria-label={label}
                  onClick={() => show(item)}
                >
                  <Icon size={18} />
                  {short}
                </button>
              ))}
            </Fragment>
          ))}
        </nav>
      </div>
    </SidebarProvider>
  );
}
