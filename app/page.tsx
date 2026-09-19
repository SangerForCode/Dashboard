"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  Compass,
  Network,
  Wallet,
  Layers,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
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
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function Home() {
  const [source] = useState(() => createSimulationSource());
  const [snapshot, setSnapshot] = useState(() => source.initial());
  const [live, setLive] = useState(true);
  const [section, setSection] = useState("Overview");
  const [dataset, setDataset] = useState("Portfolio");
  const assets = useMemo(() => enrich(snapshot.assets), [snapshot]);
  const ideas = useMemo(() => insights(assets), [assets]);
  const stats = useMemo(() => portfolioStats(assets), [assets]);
  const value = stats.value;
  useEffect(() => {
    if (!live) return;
    return source.subscribe(setSnapshot);
  }, [live, source]);
  return (
    <SidebarProvider>
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <span className="brand-mark">
              <ChartNoAxesCombined size={23} />
            </span>
            folio<span className="brand-dot">.</span>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <div className="workspace">
            <span className="workspace-icon">P</span>
            <div>
              Personal workspace<small>Demo portfolio</small>
            </div>
          </div>
          <p className="nav-label">WORKSPACE</p>
          <SidebarMenu>
            {(
              [
                ["Overview", Compass],
                ["Explore data", ChartNoAxesCombined],
                ["Relationships", Network],
                ["Portfolio", Wallet],
                ["Insights", Sparkles],
              ] as const
            ).map(([label, Icon]) => (
              <SidebarMenuItem key={String(label)}>
                <SidebarMenuButton
                  isActive={section === label}
                  onClick={() => setSection(String(label))}
                >
                  <Icon size={19} />
                  <span>{String(label)}</span>
                  {section === label && <span className="nav-indicator" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="sidebar-note">
            <span className="note-icon">✳</span>
            <b>
              A little clarity.
              <br />A better perspective.
            </b>
            <p>Explore the stories behind your numbers.</p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="simulation-label">
            <span />
            Simulated market data
          </div>
          <div className="profile">
            <span>AS</span>
            <div>
              Ayush’s workspace<small>Personal account</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-main">
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{section}</b>
          </div>
          <span className="topbar-right">
            <span className="demo-tag">DEMO</span>All values in INR{" "}
            <span className="avatar">AS</span>
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DATA, A CLEARER PICTURE</div>
              <h1>
                {section === "Overview"
                  ? "See the bigger picture."
                  : section === "Explore data"
                    ? "Follow your curiosity."
                    : section === "Relationships"
                      ? "Everything is connected."
                      : section === "Portfolio"
                        ? "Know what you own."
                        : "The story behind the numbers."}
              </h1>
              <p>
                Understand what’s moving, what’s connected, and what matters.
              </p>
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
          <div className="dataset-row">
            <Tabs value={dataset} onValueChange={setDataset}>
              <TabsList variant="line">
                {["Portfolio", "Market", "Transactions"].map((x) => (
                  <TabsTrigger value={x} key={x}>
                    {x === "Portfolio" ? (
                      <Wallet />
                    ) : x === "Market" ? (
                      <Activity />
                    ) : (
                      <Layers />
                    )}
                    {x}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <span className="muted">30 assets · 7 countries</span>
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
          <div className="insight-strip">
            <Sparkles size={20} />
            <div>
              <b>A connection worth exploring</b>
              <p>{ideas[2]?.text}</p>
            </div>
            <button
              onClick={() => setSection("Relationships")}
              aria-label="Explore relationships"
            >
              <ArrowUpRight size={20} />
            </button>
          </div>
          <Explorer snapshot={snapshot} section={section} dataset={dataset} />
          <footer>
            Built for understanding.{" "}
            <span>Reproducible simulation · Not live market prices</span>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}
