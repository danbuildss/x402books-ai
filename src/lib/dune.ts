// Dune Analytics API client for BANKR ecosystem data.
// Query 6900376: top 331 BANKR tokens by fees — includes live price, mcap, volume, 24h change.
// Query 6899023: all 1.5M BANKR tokens — token address + symbol only.

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

type DuneResult<T> = {
  result?: { rows?: T[] };
};

// In-memory cache
let cache: { tokens: DuneToken[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchBankrTopTokens(): Promise<DuneToken[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.tokens;

  const key = process.env.DUNE_API_KEY;
  if (!key) {
    console.error("DUNE_API_KEY is not set — BANKR token data unavailable");
    return [];
  }

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

    cache = { tokens, ts: Date.now() };
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
