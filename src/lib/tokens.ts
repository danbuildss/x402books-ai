export const STABLECOIN_ADDRESSES = new Set([
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
  "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", // USDT on Base
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI on Base
  "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42", // EURC on Base
]);

export const AGENT_TOKEN_SYMBOLS = new Set([
  "NOOK", "BNKR", "CRED", "VIRTUAL", "XBOOKS",
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
};

export async function fetchTokenPrices(
  addresses: string[],
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const toFetch = addresses.filter((a) => !isStablecoin(a));

  if (toFetch.length === 0) return prices;

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
          if (addr && price > 0 && !prices.has(addr)) {
            prices.set(addr, price);
          }
        }
      }),
    );
  } catch {
    // price failures are non-fatal
  }

  return prices;
}
