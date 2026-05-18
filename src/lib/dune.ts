// Dune Analytics API client for BANKR ecosystem data.
// Query 6900376: top ~500 BANKR tokens by fees — includes live price, mcap, volume, 24h change.
// Query 6899023: all BANKR tokens — token address + symbol only (used for full ecosystem registry).

const DUNE_API_BASE = "https://api.dune.com/api/v1";

export type DuneToken = {
  ca: string;              // token contract address (lowercase hex)
  ticker: string;          // symbol e.g. "BNKR"
  name: string;            // display name e.g. "BankrCoin"
  current_price: number;
  market_cap: number;
  volume_24h: number;
  price_change_24h: number;
  creator_fees_usd: number;
  bankr_fees_usd: number;
  total_fees_usd: number;
  rank_mcap: number;
  rank_fees: number;
};

type DuneMinToken = {
  ca: string;
  ticker: string;
};

type DuneResult<T> = {
  result?: { rows?: T[] };
};

// ── Top tokens cache (query 6900376) ──────────────────────────────────────────

let topCache: { tokens: DuneToken[]; ts: number } | null = null;
const TOP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchBankrTopTokens(): Promise<DuneToken[]> {
  if (topCache && Date.now() - topCache.ts < TOP_CACHE_TTL) return topCache.tokens;

  const key = process.env.DUNE_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `${DUNE_API_BASE}/query/6900376/results?limit=500`,
      {
        headers: { "X-Dune-API-Key": key, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return [];

    const data = await res.json() as DuneResult<DuneToken>;
    const tokens = (data.result?.rows ?? []).map((t) => ({
      ...t,
      ca: (t.ca ?? "").toLowerCase(),
    }));

    topCache = { tokens, ts: Date.now() };
    return tokens;
  } catch {
    return [];
  }
}

// ── Full registry cache (query 6899023) ───────────────────────────────────────
// Returns all BANKR tokens as { ca, ticker } pairs — address + symbol only.
// Cached for 30 minutes since this list is large and changes slowly.

let allCache: { tokens: DuneMinToken[]; ts: number } | null = null;
const ALL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchAllBankrTokens(): Promise<DuneMinToken[]> {
  if (allCache && Date.now() - allCache.ts < ALL_CACHE_TTL) return allCache.tokens;

  const key = process.env.DUNE_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `${DUNE_API_BASE}/query/6899023/results?limit=100000`,
      {
        headers: { "X-Dune-API-Key": key, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
        next: { revalidate: 1800 },
      },
    );
    if (!res.ok) return [];

    const data = await res.json() as DuneResult<DuneMinToken>;
    const tokens = (data.result?.rows ?? []).map((t) => ({
      ca: (t.ca ?? "").toLowerCase(),
      ticker: (t.ticker ?? "").replace(/^\$/, "").toUpperCase(),
    }));

    allCache = { tokens, ts: Date.now() };
    return tokens;
  } catch {
    return [];
  }
}

// Convenience: returns a Map<tokenAddress, DuneToken> for O(1) lookups
export async function fetchBankrTokenMap(): Promise<Map<string, DuneToken>> {
  const tokens = await fetchBankrTopTokens();
  return new Map(tokens.map((t) => [t.ca.toLowerCase(), t]));
}
