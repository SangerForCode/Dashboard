"use client";
import { useRef, useEffect, useState } from "react";
import type { EChartsOption, EChartsType } from "echarts";
export interface ChartClick {
  name?: string;
  value?: unknown;
  data?: unknown;
  dataType?: string;
  seriesType?: string;
}
export default function Chart({
  option,
  onClick,
  map = false,
  isDark = false,
}: {
  option: EChartsOption;
  onClick: (event: ChartClick) => void;
  map?: boolean;
  isDark?: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const handler = useRef(onClick);
  handler.current = onClick;
  const latest = useRef(option);
  const previousTheme = useRef(isDark);
  latest.current = option;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    setReady(false);
    setError("");
    (async () => {
      try {
        const echarts = await import("echarts");
        if (map) {
          const response = await fetch("/data/world.geojson");
          if (!response.ok) throw Error("Map unavailable");
          echarts.registerMap("world", await response.json());
        }
        if (!active || !element.current) return;
        chart.current = echarts.init(element.current, undefined, {
          renderer: "canvas",
        });
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        chart.current.setOption({ ...latest.current, animation: !reduced });
        chart.current.on("click", (p) => handler.current(p as ChartClick));
        observer = new ResizeObserver(() => chart.current?.resize());
        observer.observe(element.current);
        setReady(true);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to load visualization",
          );
      }
    })();
    return () => {
      active = false;
      observer?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, [map]);
  useEffect(() => {
    if (chart.current) {
      const changedTheme = previousTheme.current !== isDark;
      chart.current.setOption(
        {
          ...option,
          animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
        },
        // A palette change should not discard a user’s current zoom or hover state.
        { notMerge: !changedTheme },
      );
      previousTheme.current = isDark;
    }
  }, [option, isDark]);
  return (
    <div className="chart-wrap">
      <div
        className="echart"
        ref={element}
        role="img"
        aria-label="Interactive visualization. A text summary and selectable asset list follow the chart."
      />
      {!ready && !error && (
        <div className="chart-loading">Preparing your visualization…</div>
      )}
      {error && (
        <div role="alert" className="chart-loading">
          {error}. Try another visualization.
        </div>
      )}
    </div>
  );
}
