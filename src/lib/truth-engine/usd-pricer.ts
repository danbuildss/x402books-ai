// Deterministic USD pricing for on-chain stablecoin amounts.
// Stablecoins are pegged 1:1 — USD value = rawValue / 10^decimals.
// Non-stablecoin assets return undefined (requires a price oracle).

const STABLECOIN_DECIMALS: Record<string, number> = {
  // Base
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": 6,   // USDC
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": 6,   // USDbC
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": 18,  // DAI
  // Ethereum
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6,   // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,   // USDT
  "0x6b175474e89094c44da98b954eedeac495271d0f": 18,  // DAI
  // Arbitrum
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": 6,   // USDC.e
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831": 6,   // USDC
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": 6,   // USDT
  // Optimism
  "0x7f5c764cbc14f9669b88837ca1490cca17c31607": 6,   // USDC.e
  "0x0b2c639c533813f4aa9d7837caf62653d097ff85": 6,   // USDC
  "0x94b008aa00579c1307b0ef2c499ab98a8ce58e58": 6,   // USDT
  // Polygon
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": 6,   // USDC.e
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": 6,   // USDC
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": 6,   // USDT
};

export function stablecoinUsd(
  assetAddress: string | undefined,
  _chain: string,
  rawValue: string,
  decimalsOverride?: number,
): number | undefined {
  if (!assetAddress) return undefined;
  const addr = assetAddress.toLowerCase();
  const knownDecimals = STABLECOIN_DECIMALS[addr];
  if (knownDecimals === undefined) return undefined;
  const decimals = decimalsOverride ?? knownDecimals;
  if (!rawValue || rawValue === "0x0" || rawValue === "0") return 0;
  // Parse hex or decimal string as a float via string manipulation to avoid BigInt compat issues
  let numeric: number;
  try {
    if (rawValue.startsWith("0x") || rawValue.startsWith("0X")) {
      numeric = parseInt(rawValue, 16);
    } else {
      numeric = Number(rawValue);
    }
  } catch {
    return undefined;
  }
  if (!Number.isFinite(numeric)) return undefined;
  return numeric / Math.pow(10, decimals);
}
