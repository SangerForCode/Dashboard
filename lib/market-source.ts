import { generate, advance } from "./data-generator";
import type { MarketSnapshot } from "@/types/market";
/** Swap this adapter for an HTTP/WebSocket implementation without changing charts. */
export interface MarketSource {
  initial(): MarketSnapshot;
  subscribe(onSnapshot: (snapshot: MarketSnapshot) => void): () => void;
}
export function createSimulationSource(
  seed = 42,
  interval = 4000,
): MarketSource {
  let snapshot = generate(seed);
  return {
    initial: () => snapshot,
    subscribe: (onSnapshot) => {
      const timer = setInterval(() => {
        snapshot = advance(snapshot);
        onSnapshot(snapshot);
      }, interval);
      return () => clearInterval(timer);
    },
  };
}
