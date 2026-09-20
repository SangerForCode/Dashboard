import type { Asset, Transaction } from "@/types/market";
import {
  mean,
  deviation,
  correlation,
  allocations,
  returns,
  money,
  pct,
} from "./analytics";
import { colors } from "./data-generator";
import type { EChartsOption } from "echarts";
export type View =
  | "Performance"
  | "Candlestick"
  | "Sector bars"
  | "Risk & return"
  | "Correlation"
  | "Distribution"
  | "Treemap"
  | "Network"
  | "Hierarchy"
  | "Money flow"
  | "Geography"
  | "Allocation"
  | "Monthly heatmap";
export const views: View[] = [
  "Performance",
  "Candlestick",
  "Sector bars",
  "Risk & return",
  "Correlation",
  "Distribution",
  "Treemap",
  "Network",
  "Hierarchy",
  "Money flow",
  "Geography",
  "Allocation",
  "Monthly heatmap",
];
export const ranges: Record<string, number> = {
  "1D": 1,
  "1W": 5,
  "1M": 21,
  "3M": 63,
  "6M": 126,
  "1Y": 252,
  "3Y": 780,
};
export type ChartMetric =
  | "Cumulative return"
  | "Price"
  | "Portfolio value"
  | "Volume"
  | "Volatility"
  | "Momentum"
  | "Risk"
  | "Monthly return"
  | "Market cap";
export const metrics: ChartMetric[] = [
  "Cumulative return",
  "Price",
  "Portfolio value",
  "Volume",
  "Volatility",
  "Momentum",
  "Risk",
  "Monthly return",
];
export interface ChartSettings {
  view: View;
  range: string;
  metric: ChartMetric;
  selected: string;
  compare: string;
  style: string;
  size: string;
  color: string;
  sort: string;
  trend: boolean;
  distribution: string;
  allocation: string;
  dataset: string;
}
export const valueFor = (a: Asset, metric: string) =>
  metric === "Volume"
    ? a.volume
    : metric === "Price"
      ? a.price
      : metric === "Volatility"
        ? a.volatility
        : metric === "Risk"
          ? a.risk
          : metric === "Momentum"
            ? a.momentum
            : a.monthly;
export function chartOption(
  assets: Asset[],
  transactions: Transaction[],
  s: ChartSettings,
  isDark = false,
): EChartsOption {
  const theme = isDark
    ? {
        primary: "#91a7ff", positive: "#56c6ac", negative: "#e48191",
        text: "#9ba6b8", strong: "#eef2f8", grid: "rgba(170, 190, 225, 0.08)",
        border: "rgba(170, 190, 225, 0.16)", tooltip: "rgba(20, 25, 36, 0.94)",
        pale: "#23304d", map: "#1a2233", mapHover: "#293959", white: "#10141e",
        neutral: "#687693", volume: "#687693", legend: "#9ba6b8", trend: "#687693",
        tree: "#556390", sankeyLabel: "#9ba6b8", heatMid: "#1b2130", treemapPositive: "#56c6ac",
        treemapNegative: "#e48191", correlationNegative: "#e48191",
        monthlyNegative: "#e48191", monthlyPositive: "#56c6ac",
      }
    : {
        primary: "#6761df", positive: "#43a18b", negative: "#c76676",
        text: "#88899b", strong: "#343349", grid: "#f0f0f6",
        border: "#e9e8f3", tooltip: "#fff", pale: "#ece9fb", map: "#eeedf5",
        mapHover: "#dedbf0", white: "#fff", neutral: "#c6c4e5", volume: "#c6c4e5",
        legend: "#818092", trend: "#aaa5c6", tree: "#d3cee9", sankeyLabel: "#767386",
        heatMid: "#f4f1f8",
        treemapPositive: "#76b4a8", treemapNegative: "#cc8d9a",
        correlationNegative: "#d5808e", monthlyNegative: "#cc8494", monthlyPositive: "#68ad9a",
      };
  const purple = theme.primary, green = theme.positive, red = theme.negative;
  const grid = { left: 60, right: 25, top: 40, bottom: 64 };
  const base: EChartsOption = {
    animationDuration: 400,
    animationDurationUpdate: 500,
    textStyle: { fontFamily: "Arial", fontSize: 12, color: theme.text },
    color: Object.values(colors),
    grid,
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: theme.tooltip,
      borderColor: theme.border,
      textStyle: { color: theme.strong, fontSize: 13 },
    },
    aria: { enabled: true },
  };
  const ax = {
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: theme.grid } },
    axisLabel: { color: theme.text, fontSize: 11 },
  };
  const all = assets;
  const groups = allocations(all);
  const a = assets.find((x) => x.ticker === s.selected) || assets[0];
  if (!a) return base;
  const count = ranges[s.range] || 252;
  const history = a.history.slice(-Math.max(count, 2));
  if (s.view === "Performance" || s.view === "Candlestick") {
    const dates = history.map((p) => p.date);
    const chosen = s.selected === "Portfolio" ? all : [a];
    const line = (asset: Asset) => {
      const h = asset.history.slice(-Math.max(count, 2));
      return h.map((p, i) =>
        s.metric === "Price"
          ? p.close
          : s.metric === "Volume"
            ? p.volume
            : s.metric === "Volatility"
              ? deviation(
                  asset.history
                    .slice(
                      Math.max(0, asset.history.length - h.length + i - 20),
                      asset.history.length - h.length + i + 1,
                    )
                    .slice(1)
                    .map((q, j, arr) =>
                      j ? q.close / arr[j - 1].close - 1 : 0,
                    ),
                ) *
                Math.sqrt(252) *
                100
              : (p.close / h[0].close - 1) * 100,
      );
    };
    const seriesValues = new Map(chosen.map((x) => [x.ticker, line(x)]));
    const totalWeight = chosen.reduce((sum, x) => sum + x.weight, 0);
    let values =
      chosen.length === 1
        ? line(a)
        : dates.map(
            (_, i) =>
              chosen.reduce(
                (sum, x) => sum + seriesValues.get(x.ticker)![i] * x.weight,
                0,
              ) / totalWeight,
          );
    if (s.selected === "Portfolio" && s.metric === "Cumulative return") {
      const balances = dates.map((_, i) =>
        all.reduce((sum, x) => {
          const h = x.history.slice(-Math.max(count, 2));
          return sum + (x.weight * 10000 * h[i].close) / x.history[0].close;
        }, 0),
      );
      values = balances.map((v) => (v / balances[0] - 1) * 100);
    }
    if (s.selected === "Portfolio" && s.metric === "Volume")
      values = dates.map((_, i) =>
        all.reduce(
          (sum, x) => sum + x.history.slice(-Math.max(count, 2))[i].volume,
          0,
        ),
      );
    if (s.metric === "Portfolio value")
      values = dates.map((_, i) =>
        all.reduce((sum, x) => {
          const h = x.history.slice(-Math.max(count, 2));
          return sum + (x.weight * 10000 * h[i].close) / x.history[0].close;
        }, 0),
      );
    const candles = s.view === "Candlestick" && s.style === "Candlestick";
    const series: NonNullable<EChartsOption["series"]> = candles
      ? [
          {
            name: a.ticker,
            type: "candlestick",
            data: history.map((p) => [p.open, p.close, p.low, p.high]),
            itemStyle: {
              color: isDark ? "transparent" : green,
              color0: red,
              borderColor: green,
              borderColor0: red,
            },
          },
        ]
      : [
          {
            name: s.selected === "Portfolio" ? "Portfolio" : a.ticker,
            type: s.metric === "Volume" ? "bar" : "line",
            data: values,
            symbol: "none",
            lineStyle: { width: 2.5, color: purple },
            itemStyle: { color: purple },
            areaStyle:
              s.style === "Area"
                ? {
                    color: {
                      type: "linear",
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: isDark ? "#91a7ff38" : "#7067e326" },
                        { offset: 1, color: isDark ? "#91a7ff00" : "#7067e300" },
                      ],
                    },
                  }
                : undefined,
          },
        ];
    if (s.compare !== "None") {
      const b = all.find((x) => x.ticker === s.compare);
      if (b && !candles)
        series.push({
          name: b.ticker,
          type: "line",
          data: line(b),
          symbol: "none",
          lineStyle: { color: green, width: 2, type: "dashed" },
        });
    }
    if (candles)
      series.push({
        name: "Volume",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: history.map((p) => p.volume),
        itemStyle: { color: theme.volume },
      });
    return {
      ...base,
      legend: {
        top: 0,
        left: 55,
        itemWidth: 15,
        itemHeight: 8,
        textStyle: { color: theme.legend },
      },
      grid: candles
        ? [
            { ...grid, bottom: 140 },
            { left: 60, right: 25, height: 55, bottom: 65 },
          ]
        : grid,
      xAxis: candles
        ? [
            {
              type: "category",
              data: dates,
              ...ax,
              axisLabel: { show: false },
            },
            { type: "category", data: dates, gridIndex: 1, ...ax },
          ]
        : {
            type: "category",
            data: dates,
            boundaryGap: false,
            ...ax,
            axisLabel: {
              ...ax.axisLabel,
              formatter: (v: string) => v.slice(5),
            },
          },
      yAxis: candles
        ? [
            { type: "value", scale: true, ...ax },
            { type: "value", gridIndex: 1, ...ax, axisLabel: { show: false } },
          ]
        : {
            type: "value",
            scale: true,
            ...ax,
            axisLabel: {
              ...ax.axisLabel,
              formatter: (v: number) =>
                Math.abs(v) > 100000
                  ? (v / 1e5).toFixed(1) + "L"
                  : s.metric.includes("return")
                    ? v.toFixed(0) + "%"
                    : v.toFixed(0),
            },
          },
      dataZoom: [
        { type: "inside", xAxisIndex: candles ? [0, 1] : 0 },
        {
          type: "slider",
          xAxisIndex: candles ? [0, 1] : 0,
          height: 18,
          bottom: 10,
          borderColor: "transparent",
          fillerColor: isDark ? "#91a7ff20" : "#7770db18",
          handleStyle: { color: purple },
          brushSelect: false,
        },
      ],
      tooltip: {
        trigger: "axis",
        confine: true,
        valueFormatter: (v) =>
          typeof v === "number"
            ? s.metric === "Cumulative return"
              ? pct(v)
              : Math.round(v).toLocaleString("en-IN")
            : String(v),
      },
      series,
    };
  }
  if (s.view === "Sector bars") {
    const data = groups
      .map((g) => ({
        ...g,
        score: mean(
          all
            .filter((a) => a.sector === g.name)
            .map((a) => valueFor(a, s.metric)),
        ),
      }))
      .sort((a, b) =>
        s.sort === "Ascending" ? a.score - b.score : b.score - a.score,
      );
    return {
      ...base,
      grid: { ...grid, left: 95 },
      xAxis: { type: "value", ...ax },
      yAxis: {
        type: "category",
        data: data.map((d) => d.name),
        inverse: true,
        ...ax,
        splitLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 32,
          data: data.map((g) => ({
            name: g.name,
            value: g.score,
            itemStyle: { color: colors[g.name], borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: "right",
            formatter: (p) => Number(p.value).toFixed(1),
            color: theme.sankeyLabel,
            textBorderColor: "transparent",
          },
        },
      ],
    };
  }
  if (s.view === "Risk & return") {
    const x = all.map((a) =>
      s.metric === "Momentum"
        ? a.momentum
        : s.metric === "Volume"
          ? a.volume
          : s.metric === "Market cap"
            ? a.marketCap / 1e9
            : a.volatility,
    );
    const y = all.map((a) => a.monthly);
    const mx = mean(x),
      my = mean(y);
    const slope =
      mean(x.map((v, i) => (v - mx) * (y[i] - my))) / (deviation(x) ** 2 || 1);
    const lo = Math.min(...x),
      hi = Math.max(...x);
    return {
      ...base,
      grid: { ...grid, left: 60, bottom: 70 },
      xAxis: {
        type: "value",
        name:
          s.metric === "Momentum"
            ? "Momentum score"
            : s.metric === "Volume"
              ? "Trading volume"
              : s.metric === "Market cap"
                ? "Market cap (₹ billion)"
                : "Typical annual movement (%)",
        nameLocation: "middle",
        nameGap: 35,
        ...ax,
        scale: true,
      },
      yAxis: { type: "value", name: "Monthly return (%)", ...ax, scale: true },
      series: [
        ...groups.map((g) => ({
          name: g.name,
          type: "scatter" as const,
          symbolSize: (_v: unknown, p: { dataIndex: number }) =>
            14 + all.filter((a) => a.sector === g.name)[p.dataIndex].weight * 2,
          data: all
            .filter((a) => a.sector === g.name)
            .map((a) => ({
              name: a.ticker,
              value: [x[all.indexOf(a)], a.monthly],
              ticker: a.ticker,
            })),
          itemStyle: {
            color: colors[g.name],
            opacity: 0.8,
            borderColor: theme.white,
            borderWidth: 2,
          },
        })),
        ...(s.trend
          ? [
              {
                name: "Overall trend",
                type: "line" as const,
                data: [
                  [lo, my + slope * (lo - mx)],
                  [hi, my + slope * (hi - mx)],
                ],
                symbol: "none",
                lineStyle: { color: theme.trend, type: "dashed" as const },
              },
            ]
          : []),
      ],
    };
  }
  if (s.view === "Correlation") {
    const sorted = [...all]
      .sort((a, b) =>
        s.sort === "Ascending"
          ? a.ticker.localeCompare(b.ticker)
          : a.sector.localeCompare(b.sector),
      )
      .slice(0, 14);
    return {
      ...base,
      grid: { left: 75, right: 20, top: 12, bottom: 92 },
      xAxis: {
        type: "category",
        data: sorted.map((a) => a.ticker),
        axisLabel: { rotate: 50, fontSize: 10, interval: 0 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "category",
        data: sorted.map((a) => a.ticker),
        axisLabel: { fontSize: 10, interval: 0 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 12,
        itemHeight: 110,
        inRange: { color: [theme.correlationNegative, theme.heatMid, purple] },
        text: ["Move together", "Move apart"],
        textStyle: { fontSize: 10 },
      },
      series: [
        {
          type: "heatmap",
          data: sorted.flatMap((a, i) =>
            sorted.map((b, j) => ({
              value: [i, j, Number(correlation(a, b).toFixed(2))],
              name: `${a.ticker} × ${b.ticker}`,
            })),
          ),
          label: { show: sorted.length <= 8, fontSize: 11 },
          itemStyle: { borderColor: theme.white, borderWidth: 3 },
          emphasis: { itemStyle: { borderColor: purple, borderWidth: 2 } },
        },
      ],
    };
  }
  if (s.view === "Distribution") {
    const vals = all
      .map((a) =>
        s.distribution === "Daily returns"
          ? a.daily
          : s.distribution === "Volatility"
            ? a.volatility
            : a.monthly,
      )
      .sort((a, b) => a - b);
    const quant = (p: number) => vals[Math.floor((vals.length - 1) * p)];
    const iqr = quant(0.75) - quant(0.25);
    const typical = vals.filter(
      (v) => v >= quant(0.25) - 1.5 * iqr && v <= quant(0.75) + 1.5 * iqr,
    );
    const outliers = vals.filter((v) => !typical.includes(v));
    if (s.style === "Box plot")
      return {
        ...base,
        xAxis: { type: "category", data: [s.distribution], ...ax },
        yAxis: { type: "value", ...ax },
        series: [
          {
            type: "boxplot",
            data: [
              [
                typical[0],
                quant(0.25),
                quant(0.5),
                quant(0.75),
                typical.at(-1)!,
              ],
            ],
            itemStyle: { color: theme.pale, borderColor: purple },
          },
          {
            type: "scatter",
            name: "Outliers",
            data: outliers.map((v) => [0, v]),
            itemStyle: { color: red },
          },
        ],
      };
    const min = vals[0],
      max = vals.at(-1)!,
      step = (max - min || 1) / 8;
    const bins = Array.from({ length: 8 }, (_, i) => ({
      name: `${(min + i * step).toFixed(1)}–${(min + (i + 1) * step).toFixed(1)}%`,
      value: vals.filter(
        (v) =>
          v >= min + i * step &&
          (i === 7 ? v <= max : v < min + (i + 1) * step),
      ).length,
    }));
    return {
      ...base,
      xAxis: {
        type: "category",
        data: bins.map((b) => b.name),
        ...ax,
        axisLabel: { rotate: 25, fontSize: 10 },
      },
      yAxis: { type: "value", name: "Number of assets", minInterval: 1, ...ax },
      series: [
        {
          type: "bar",
          data: bins.map((b) => b.value),
          barCategoryGap: "8%",
          itemStyle: { color: purple, borderRadius: [5, 5, 0, 0] },
        },
      ],
    };
  }
  if (s.view === "Treemap")
    return {
      ...base,
      series: [
        {
          type: "treemap",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          left: 8,
          right: 8,
          top: 5,
          bottom: 5,
          label: {
            show: true,
            formatter: (p) => {
              const a = all.find((a) => a.ticker === p.name);
              const v = a
                ? s.color === "Monthly return"
                  ? a.monthly
                  : s.color === "Volatility"
                    ? a.volatility
                    : a.daily
                : 0;
              return `${p.name}\n${s.color === "Volatility" ? v.toFixed(1) + "%" : pct(v)}`;
            },
            fontSize: 13,
            lineHeight: 22,
          },
          itemStyle: { borderColor: theme.white, borderWidth: 3, gapWidth: 3 },
          data: all.map((a) => ({
            name: a.ticker,
            value:
              s.size === "Market cap"
                ? a.marketCap
                : s.size === "Volume"
                  ? a.volume
                  : a.weight,
            itemStyle: {
              color:
                (s.color === "Monthly return"
                  ? a.monthly
                  : s.color === "Volatility"
                    ? a.volatility - 20
                    : a.daily) >= 0
                  ? theme.treemapPositive
                  : theme.treemapNegative,
            },
          })),
        },
      ],
    };
  if (s.view === "Hierarchy")
    return {
      ...base,
      series: [
        {
          type: "tree",
          data: [
            {
              name: "Portfolio",
              children: groups.map((g) => ({
                name: g.name,
                children: all
                  .filter((a) => a.sector === g.name)
                  .map((a) => ({ name: a.ticker, value: a.weight })),
              })),
            },
          ],
          left: "10%",
          right: "20%",
          top: 20,
          bottom: 20,
          initialTreeDepth: 1,
          symbolSize: 12,
          expandAndCollapse: true,
          label: {
            position: "left",
            fontSize: 12,
            color: theme.sankeyLabel,
            textBorderColor: "transparent",
          },
          leaves: {
            label: {
              position: "right",
              color: theme.sankeyLabel,
              textBorderColor: "transparent",
            },
          },
          lineStyle: { color: theme.tree },
          itemStyle: { color: purple },
        },
      ],
    };
  if (s.view === "Money flow") {
    const sums = groups.map((g) => ({
      ...g,
      amount:
        s.dataset === "Transactions"
          ? transactions
              .filter(
                (t) =>
                  t.sector === g.name && all.some((a) => a.ticker === t.asset),
              )
              .reduce((v, t) => v + t.amount, 0)
          : g.value * 10000,
    }));
    return {
      ...base,
      series: [
        {
          type: "sankey",
          left: 15,
          right: 90,
          top: 15,
          bottom: 15,
          nodeWidth: 10,
          nodeGap: 10,
          draggable: true,
          emphasis: { focus: "adjacency" },
          label: { fontSize: 11, color: theme.sankeyLabel },
          lineStyle: { color: "source", opacity: 0.2, curveness: 0.5 },
          data: [
            { name: "Capital", itemStyle: { color: purple } },
            ...groups.map((g) => ({
              name: g.name,
              itemStyle: { color: colors[g.name] },
            })),
            ...all.map((a) => ({
              name: a.ticker,
              itemStyle: { color: colors[a.sector] },
            })),
            { name: "Portfolio", itemStyle: { color: purple } },
          ],
          links: [
            ...sums.map((g) => ({
              source: "Capital",
              target: g.name,
              value: g.amount,
            })),
            ...all.flatMap((a) => {
              const amount =
                s.dataset === "Transactions"
                  ? transactions
                      .filter((t) => t.asset === a.ticker)
                      .reduce((v, t) => v + t.amount, 0)
                  : a.weight * 10000;
              return [
                { source: a.sector, target: a.ticker, value: amount },
                { source: a.ticker, target: "Portfolio", value: amount },
              ];
            }),
          ],
        },
      ],
    };
  }
  if (s.view === "Geography") {
    const countries = [...new Set(all.map((a) => a.country))];
    return {
      ...base,
      geo: {
        map: "world",
        roam: true,
        itemStyle: { areaColor: theme.map, borderColor: theme.white },
        emphasis: {
          itemStyle: { areaColor: theme.mapHover },
          label: { show: false },
        },
        left: 5,
        right: 5,
        top: 5,
        bottom: 5,
      },
      series: [
        {
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: (v) => 12 + Math.sqrt(Number(v[2])) * 4,
          data: countries.map((c) => {
            const members = all.filter((a) => a.country === c);
            return {
              name: c,
              value: [
                members[0].lon,
                members[0].lat,
                members.reduce((v, a) => v + a.weight, 0),
              ],
            };
          }),
          itemStyle: { color: purple, opacity: 0.75 },
          label: {
            show: true,
            formatter: "{b}",
            position: "top",
            fontSize: 11,
            color: theme.sankeyLabel,
            textBorderColor: "transparent",
          },
        },
      ],
    };
  }
  if (s.view === "Monthly heatmap") {
    const months = [
      ...new Set(a.history.slice(-252).map((p) => p.date.slice(0, 7))),
    ];
    return {
      ...base,
      grid: { left: 85, right: 15, top: 15, bottom: 65 },
      xAxis: {
        type: "category",
        data: months.map((m) => m.slice(2)),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: all.slice(0, 10).map((a) => a.ticker),
        axisLabel: { fontSize: 10 },
      },
      visualMap: {
        min: -15,
        max: 15,
        show: false,
        inRange: { color: [theme.monthlyNegative, theme.heatMid, theme.monthlyPositive] },
      },
      series: [
        {
          type: "heatmap",
          data: all.slice(0, 10).flatMap((a, j) =>
            months.map((m, i) => {
              const h = a.history.filter((p) => p.date.startsWith(m));
              return {
                name: `${a.ticker} · ${m}`,
                value: [
                  i,
                  j,
                  h.length ? (h.at(-1)!.close / h[0].open - 1) * 100 : 0,
                ],
              };
            }),
          ),
          itemStyle: { borderColor: theme.white, borderWidth: 3 },
        },
      ],
    };
  }
  return {
    ...base,
    legend: {
      orient: "vertical",
      right: 15,
      top: "center",
      itemHeight: 10,
      textStyle: { fontSize: 12 },
    },
    series:
      s.allocation === "Stacked bar"
        ? groups.map((g) => ({
            type: "bar",
            name: g.name,
            stack: "allocation",
            data: [g.value],
            itemStyle: { color: colors[g.name] },
            label: { show: true, formatter: () => g.value.toFixed(1) + "%" },
          }))
        : [
            {
              type: "pie",
              radius: ["48%", "72%"],
              center: ["40%", "50%"],
              label: { show: false },
              itemStyle: {
                borderColor: theme.white,
                borderWidth: 4,
                borderRadius: 5,
              },
              data: groups.map((g) => ({
                name: g.name,
                value: g.value,
                itemStyle: { color: colors[g.name] },
              })),
            },
          ],
    ...(s.allocation === "Stacked bar"
      ? {
          xAxis: { type: "value", max: 100, ...ax },
          yAxis: { type: "category", data: ["Portfolio"], ...ax },
        }
      : {}),
  };
}
