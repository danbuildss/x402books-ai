export const STABLECOIN_ADDRESSES = new Set([
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
  "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", // USDT on Base
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI on Base
  "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42", // EURC on Base
]);

export const LUCA_TOKEN_ADDRESS = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";

// Fallback agent token symbols used before live registry loads
export const AGENT_TOKEN_SYMBOLS = new Set([
  "BNKR", "BANKR",
  "VIRTUAL", "VIRTUALS",
  "LUNA", "AIXBT", "GAME", "VADER", "CLANKER",
  "SEKOIA", "ACOLYT", "SPORE", "MISATO", "LMAO",
  "NOOK", "CRED", "LUCA", "DEGEN", "MOCA",
]);

export function isStablecoin(address: string): boolean {
  return STABLECOIN_ADDRESSES.has(address.toLowerCase());
}

export function isAgentToken(symbol: string): boolean {
  return AGENT_TOKEN_SYMBOLS.has(symbol.toUpperCase());
}

type DexScreenerPair = {
  baseToken?: { address?: string };
  priceUsd?: string;
  priceChange?: { h24?: number; h6?: number; h1?: number };
  volume?: { h24?: number };
};

export type TokenMetrics = {
  price: number;
  priceChange24h?: number;
  volume24h?: number;
};

export async function fetchTokenMetrics(
  addresses: string[],
): Promise<Map<string, TokenMetrics>> {
  const metrics = new Map<string, TokenMetrics>();
  const toFetch = addresses.filter((a) => !isStablecoin(a));

  // Stablecoins always $1, no change
  for (const addr of addresses) {
    if (isStablecoin(addr)) metrics.set(addr.toLowerCase(), { price: 1, priceChange24h: 0 });
  }

  if (toFetch.length === 0) return metrics;

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < toFetch.length; i += 30) {
      chunks.push(toFetch.slice(i, i + 30));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`,
          { signal: AbortSignal.timeout(8_000) },
        );
        if (!res.ok) return;
        const data = await res.json() as { pairs?: DexScreenerPair[] };
        for (const pair of data.pairs ?? []) {
          const addr = pair.baseToken?.address?.toLowerCase();
          const price = parseFloat(pair.priceUsd ?? "0");
          if (addr && price > 0 && !metrics.has(addr)) {
            metrics.set(addr, {
              price,
              priceChange24h: pair.priceChange?.h24,
              volume24h: pair.volume?.h24,
            });
          }
        }
      }),
    );
  } catch {
    // non-fatal
  }

  return metrics;
}

// Backward-compat wrapper
export async function fetchTokenPrices(
  addresses: string[],
): Promise<Map<string, number>> {
  const metrics = await fetchTokenMetrics(addresses);
  return new Map([...metrics.entries()].map(([a, m]) => [a, m.price]));
}
