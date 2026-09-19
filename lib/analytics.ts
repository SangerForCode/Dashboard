import type { Asset, Relationship, Insight } from "@/types/market";
export const mean = (a: number[]) =>
  a.reduce((x, y) => x + y, 0) / (a.length || 1);
export const deviation = (a: number[]) =>
  Math.sqrt(mean(a.map((v) => (v - mean(a)) ** 2)));
export const returns = (a: Asset) =>
  a.history.slice(1).map((p, i) => p.close / a.history[i].close - 1);
export function enrich(assets: Asset[], end?: string): Asset[] {
  return assets.map((a) => {
    const h = end ? a.history.filter((p) => p.date <= end) : a.history;
    const history = h.length > 1 ? h : a.history.slice(0, 2);
    const price = history.at(-1)!.close;
    const ret = (n: number) =>
      (price / history[Math.max(0, history.length - 1 - n)].close - 1) * 100;
    const vol =
      deviation(
        history
          .slice(-31)
          .slice(1)
          .map((p, i) => p.close / history.slice(-31)[i].close - 1),
      ) *
      Math.sqrt(252) *
      100;
    return {
      ...a,
      history,
      price,
      daily: ret(1),
      weekly: ret(5),
      monthly: ret(21),
      yearly: ret(252),
      volume: history.at(-1)!.volume,
      volatility: vol,
      momentum: Math.max(0, Math.min(100, 50 + ret(21) * 3)),
      risk: Math.min(100, vol * 3),
    };
  });
}
export function correlation(a: Asset, b: Asset) {
  const x = returns(a).slice(-60),
    y = returns(b).slice(-60);
  const mx = mean(x),
    my = mean(y);
  return (
    mean(x.map((v, i) => (v - mx) * (y[i] - my))) /
    (deviation(x) * deviation(y) || 1)
  );
}
export function relationships(assets: Asset[]): Relationship[] {
  return assets
    .flatMap((a, i) =>
      assets
        .slice(i + 1)
        .map((b) => ({
          source: a.ticker,
          target: b.ticker,
          strength: correlation(a, b),
        })),
    )
    .sort((a, b) => b.strength - a.strength);
}
export function allocations(assets: Asset[]) {
  return [...new Set(assets.map((a) => a.sector))]
    .map((sector) => ({
      name: sector,
      value: assets
        .filter((a) => a.sector === sector)
        .reduce((s, a) => s + a.weight, 0),
      return: mean(
        assets.filter((a) => a.sector === sector).map((a) => a.monthly),
      ),
    }))
    .sort((a, b) => b.value - a.value);
}
export function insights(assets: Asset[]): Insight[] {
  if (!assets.length) return [];
  const groups = allocations(assets);
  const top = [...assets].sort((a, b) => b.daily - a.daily)[0];
  const pair = relationships(assets)[0];
  return [
    {
      title: "Your biggest exposure",
      text: `${groups[0].name} makes up ${groups[0].value.toFixed(1)}% of your portfolio. A move in this sector has more influence on your balance.`,
      kind: "neutral",
    },
    {
      title: "Leading today’s movement",
      text: `${top.name} is ${top.daily >= 0 ? "up" : "down"} ${Math.abs(top.daily).toFixed(2)}% today, the strongest daily return in this selection.`,
      kind: "positive",
    },
    {
      title: "A closer connection",
      text: pair
        ? `${pair.source} and ${pair.target} ${pair.strength > 0.5 ? "tend to move together" : "have the closest relationship in this selection"}. Their recent relationship score is ${pair.strength.toFixed(2)}.`
        : "Add another asset to discover relationships.",
      kind: "warning",
    },
  ];
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
/** Fixed-share buy-and-hold portfolio; initial capital is ₹10 lakh. */
export function portfolioStats(assets: Asset[]) {
  const n = assets[0]?.history.length || 0;
  const values = Array.from({ length: n }, (_, i) =>
    assets.reduce(
      (sum, a) =>
        sum + (a.weight * 10000 * a.history[i].close) / a.history[0].close,
      0,
    ),
  );
  const value = values.at(-1) || 0;
  const daily = values.length > 1 ? (value / values.at(-2)! - 1) * 100 : 0;
  const recent = values.slice(-31);
  const volatility =
    deviation(recent.slice(1).map((v, i) => v / recent[i] - 1)) *
    Math.sqrt(252) *
    100;
  return { value, daily, volatility, totalReturn: (value / 1e6 - 1) * 100 };
}
