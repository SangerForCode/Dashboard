export interface TimeSeriesPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface Asset {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  lat: number;
  lon: number;
  price: number;
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  marketCap: number;
  volume: number;
  volatility: number;
  momentum: number;
  value: number;
  quality: number;
  risk: number;
  weight: number;
  history: TimeSeriesPoint[];
}
export interface Relationship {
  source: string;
  target: string;
  strength: number;
}
export interface Transaction {
  id: string;
  asset: string;
  sector: string;
  amount: number;
  date: string;
}
export interface Portfolio {
  value: number;
  assets: Asset[];
}
export interface Insight {
  title: string;
  text: string;
  kind: "positive" | "neutral" | "warning";
}
export interface MarketSnapshot {
  assets: Asset[];
  transactions: Transaction[];
  tick: number;
}
