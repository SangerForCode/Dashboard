import type { Asset, MarketSnapshot } from "@/types/market";
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const catalog = [
  ["NVDA", "NVIDIA", "Technology", 125, "US"],
  ["MSFT", "Microsoft", "Technology", 420, "US"],
  ["AAPL", "Apple", "Technology", 220, "US"],
  ["AMD", "Advanced Micro Devices", "Technology", 155, "US"],
  ["TSM", "Taiwan Semiconductor", "Technology", 180, "Taiwan"],
  ["GOOGL", "Alphabet", "Technology", 175, "US"],
  ["HDFCBANK", "HDFC Bank", "Banking", 1700, "India"],
  ["ICICIBANK", "ICICI Bank", "Banking", 1200, "India"],
  ["JPM", "JPMorgan Chase", "Banking", 210, "US"],
  ["BAC", "Bank of America", "Banking", 42, "US"],
  ["RELIANCE", "Reliance Industries", "Energy", 2900, "India"],
  ["XOM", "Exxon Mobil", "Energy", 115, "US"],
  ["ONGC", "ONGC", "Energy", 270, "India"],
  ["CVX", "Chevron", "Energy", 150, "US"],
  ["UNH", "UnitedHealth", "Healthcare", 510, "US"],
  ["JNJ", "Johnson & Johnson", "Healthcare", 160, "US"],
  ["SUNPHARMA", "Sun Pharma", "Healthcare", 1800, "India"],
  ["PFE", "Pfizer", "Healthcare", 30, "US"],
  ["AMZN", "Amazon", "Consumer", 190, "US"],
  ["TSLA", "Tesla", "Consumer", 240, "US"],
  ["WMT", "Walmart", "Consumer", 75, "US"],
  ["TATAMOTORS", "Tata Motors", "Consumer", 950, "India"],
  ["INFY", "Infosys", "Technology", 1850, "India"],
  ["TCS", "Tata Consultancy", "Technology", 4100, "India"],
  ["HSBC", "HSBC", "Banking", 45, "UK"],
  ["SHEL", "Shell", "Energy", 70, "UK"],
  ["AZN", "AstraZeneca", "Healthcare", 80, "UK"],
  ["BABA", "Alibaba", "Consumer", 90, "China"],
  ["SAP", "SAP", "Technology", 230, "Germany"],
  ["SONY", "Sony", "Consumer", 95, "Japan"],
] as const;
export const sectors = [
  "Technology",
  "Banking",
  "Energy",
  "Healthcare",
  "Consumer",
];
export const colors: Record<string, string> = {
  Technology: "#5b63e6",
  Banking: "#40a496",
  Energy: "#e4a44f",
  Healthcare: "#b478c2",
  Consumer: "#7294ca",
};
const coords: Record<string, [number, number]> = {
  US: [37, -97],
  India: [21, 78],
  UK: [54, -2],
  Taiwan: [24, 121],
  China: [35, 105],
  Germany: [51, 10],
  Japan: [36, 138],
};
export function generate(seed = 42): MarketSnapshot {
  const rng = random(seed);
  const normal = () =>
    Math.sqrt(-2 * Math.log(Math.max(rng(), 0.00001))) *
    Math.cos(2 * Math.PI * rng());
  const dates: string[] = [];
  const cursor = new Date("2026-09-18T00:00:00Z");
  while (dates.length < 780) {
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6)
      dates.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const factors = Array.from({ length: 780 }, () => ({
    market: normal() * 0.006,
    sectors: sectors.map(() => normal() * 0.008),
  }));
  const weights = catalog.map(() => 0.4 + rng() * 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const assets: Asset[] = catalog.map(
    ([ticker, name, sector, base, country], i) => {
      let price = base * (country === "India" ? 1 : 83);
      const history = factors.map((f, j) => {
        const open = price;
        price *= Math.exp(
          0.00035 +
            f.market +
            f.sectors[sectors.indexOf(sector)] * 0.8 +
            normal() * 0.006,
        );
        const swing = Math.abs(normal()) * 0.006;
        return {
          date: dates[j],
          open,
          close: price,
          high: Math.max(open, price) * (1 + swing),
          low: Math.min(open, price) * (1 - swing),
          volume: Math.round((0.4 + rng()) * 4000000),
        };
      });
      const last = history.at(-1)!;
      return {
        ticker,
        name,
        sector,
        industry: sector,
        country,
        lat: coords[country][0],
        lon: coords[country][1],
        price: last.close,
        daily: 0,
        weekly: 0,
        monthly: 0,
        yearly: 0,
        marketCap: (50 + rng() * 2500) * 1e9,
        volume: last.volume,
        volatility: 0,
        momentum: 0,
        value: Math.round(30 + rng() * 65),
        quality: Math.round(50 + rng() * 45),
        risk: 0,
        weight: (weights[i] / total) * 100,
        history,
      };
    },
  );
  return {
    assets,
    transactions: assets.map((a, i) => ({
      id: `tx-${i}`,
      asset: a.ticker,
      sector: a.sector,
      amount: a.weight * 10000,
      date: a.history.at(-1)!.date,
    })),
    tick: 0,
  };
}
export function advance(snapshot: MarketSnapshot): MarketSnapshot {
  const rng = random(173 + snapshot.tick);
  const market = (rng() - 0.49) * 0.0018;
  const moves = sectors.map(() => (rng() - 0.5) * 0.002);
  const assets = snapshot.assets.map((a) => {
    const history = [...a.history];
    const last = { ...history.at(-1)! };
    last.close *=
      1 + market + moves[sectors.indexOf(a.sector)] + (rng() - 0.5) * 0.001;
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
    last.volume += Math.round(rng() * 20000);
    history[history.length - 1] = last;
    return { ...a, price: last.close, volume: last.volume, history };
  });
  return {
    assets,
    tick: snapshot.tick + 1,
    transactions: snapshot.transactions.map((t, i) => ({
      ...t,
      amount: t.amount * (assets[i].price / snapshot.assets[i].price),
    })),
  };
}
