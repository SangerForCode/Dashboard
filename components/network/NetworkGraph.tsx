"use client";
import { useRef, useEffect, useMemo, useState } from "react";
import {
  select,
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  drag,
  zoom,
  zoomIdentity,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type ZoomBehavior,
} from "d3";
import { Plus, Minus, RotateCcw } from "lucide-react";
import type { Asset } from "@/types/market";
import { relationships } from "@/lib/analytics";
import { colors, sectors } from "@/lib/data-generator";
interface Node extends SimulationNodeDatum {
  ticker: string;
  sector: string;
  radius: number;
  risk: number;
}
interface Link extends SimulationLinkDatum<Node> {
  strength: number;
}
export default function NetworkGraph({
  assets,
  selected,
  onSelect,
  threshold,
  isDark = false,
}: {
  assets: Asset[];
  selected: string;
  onSelect: (ticker: string) => void;
  threshold: number;
  isDark?: boolean;
}) {
  const [layoutVersion, setLayoutVersion] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const links = useMemo(
    () => relationships(assets).filter((r) => r.strength >= threshold),
    [assets, threshold],
  );
  const stableKey = assets.map((a) => a.ticker).join(",") + ":" + threshold;
  const current = useRef({ assets, links });
  current.current = { assets, links };
  useEffect(() => {
    if (!svg.current) return;
    const root = select(svg.current);
    root.selectAll("*").remove();
    const { assets, links } = current.current;
    const nodes: Node[] = assets.map((a, i) => ({
      ticker: a.ticker,
      sector: a.sector,
      radius: 13 + Math.sqrt(a.marketCap / 1e12) * 10,
      risk: a.risk,
      x: 150 + (i % 6) * 90,
      y: 80 + Math.floor(i / 6) * 65,
    }));
    const edges: Link[] = links.map((l) => ({
      source: l.source,
      target: l.target,
      strength: l.strength,
    }));
    const g = root.append("g");
    const lines = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", isDark ? "#556390" : "#b6b1d5")
      .attr("stroke-width", (d) => Math.max(0.5, d.strength * 2.5))
      .attr("stroke-opacity", (d) => d.strength * 0.7);
    const ns = g
      .append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes)
      .join("g")
      .attr("class", "network-node")
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-label", (d) => `${d.ticker}, ${d.sector}. Show connections`)
      .on("click", (event, d) => {
        event.stopPropagation();
        callback.current(d.ticker);
      })
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          callback.current(d.ticker);
        }
      });
    ns.append("circle")
      .attr("r", (d) => d.radius + 7)
      .attr("fill", "transparent");
    ns.append("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => colors[d.sector])
      .attr("fill-opacity", 0.13)
      .attr("stroke", (d) => colors[d.sector])
      .attr("stroke-width", (d) => (d.risk > 65 ? 2.5 : 1.2))
      .attr("stroke-dasharray", (d) => (d.risk > 65 ? "3 2" : ""));
    ns.append("text")
      .text((d) => d.ticker)
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", (d) => (d.ticker.length > 6 ? 9 : 11))
      .attr("font-weight", 600)
      .attr("fill", (d) => colors[d.sector]);
    ns.append("title").text(
      (d) => `${d.ticker} · ${d.sector} · Click to explore relationships`,
    );
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<Node, Link>(edges)
          .id((d) => d.ticker)
          .distance(95)
          .strength(0.12),
      )
      .force("charge", forceManyBody().strength(-130))
      .force("center", forceCenter(400, 210))
      .force(
        "collide",
        forceCollide<Node>((d) => d.radius + 20),
      )
      .force(
        "x",
        forceX<Node>((d) => 130 + sectors.indexOf(d.sector) * 135).strength(
          0.06,
        ),
      )
      .force("y", forceY(210).strength(0.03));
    const render = () => {
      lines
        .attr("x1", (d) => (d.source as Node).x || 0)
        .attr("y1", (d) => (d.source as Node).y || 0)
        .attr("x2", (d) => (d.target as Node).x || 0)
        .attr("y2", (d) => (d.target as Node).y || 0);
      ns.attr("transform", (d) => `translate(${d.x},${d.y})`);
    };
    sim.stop();
    for (let i = 0; i < 220; i++) sim.tick();
    render();
    sim.on("tick", render);
    ns.call(
      drag<SVGGElement, Node>()
        .on("start", (e, d) => {
          if (!e.active) sim.alphaTarget(0.1).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (e, d) => {
          d.fx = e.x;
          d.fy = e.y;
        })
        .on("end", (e) => {
          if (!e.active) sim.alphaTarget(0);
        }),
    );
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 4])
      .on("zoom", (e) => g.attr("transform", e.transform));
    root.call(z);
    zoomRef.current = z;
    return () => {
      sim.stop();
      root.on(".zoom", null);
    };
  }, [stableKey, layoutVersion, isDark]);
  useEffect(() => {
    if (!svg.current) return;
    const connected = new Set(
      links
        .filter((l) => l.source === selected || l.target === selected)
        .flatMap((l) => [l.source, l.target]),
    );
    connected.add(selected);
    select(svg.current)
      .selectAll<SVGGElement, Node>(".network-node")
      .attr("opacity", (d) =>
        selected === "Portfolio" ||
        !assets.some((a) => a.ticker === selected) ||
        connected.has(d.ticker)
          ? 1
          : 0.18,
      );
    select(svg.current)
      .selectAll<SVGLineElement, Link>("line")
      .each((d) => {
        const live = links.find(
          (l) =>
            l.source === (d.source as Node).ticker &&
            l.target === (d.target as Node).ticker,
        );
        if (live) d.strength = live.strength;
      })
      .attr("stroke-width", (d) => Math.max(0.5, d.strength * 2.5))
      .attr("stroke-opacity", (d) =>
        selected === "Portfolio"
          ? d.strength * 0.7
          : (d.source as Node).ticker === selected ||
              (d.target as Node).ticker === selected
            ? 0.8
            : 0.05,
      );
  }, [selected, links, assets]);
  function scale(f: number) {
    if (svg.current && zoomRef.current)
      select(svg.current).call(zoomRef.current.scaleBy, f);
  }
  function reset() {
    setLayoutVersion((v) => v + 1);
    if (svg.current && zoomRef.current)
      select(svg.current).call(zoomRef.current.transform, zoomIdentity);
  }
  return (
    <div className="network-wrap">
      <svg
        ref={svg}
        viewBox="0 0 800 420"
        role="group"
        aria-label="Asset relationships. Tap a company to highlight its connections. Drag nodes or background; pinch to zoom."
      />
      <div className="network-controls">
        <button onClick={() => scale(1.25)} aria-label="Zoom in">
          <Plus size={17} />
        </button>
        <button onClick={() => scale(0.8)} aria-label="Zoom out">
          <Minus size={17} />
        </button>
        <button onClick={reset} aria-label="Reset network layout and zoom">
          <RotateCcw size={16} />
        </button>
      </div>
      <span className="network-hint">
        Drag to explore · Tap a company · Pinch to zoom
      </span>
    </div>
  );
}
