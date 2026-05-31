// $LUCA token balance checker and tier calculator.
// $LUCA is Luca's intelligence token — it unlocks Luca features, not x402Books API access.
// Contract on Base: 0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3

export type LucaTier = "free" | "holder" | "whale";

export const TIER_LIMITS: Record<LucaTier, number> = {
  free:   100,
  holder: 500,
  whale:  2_000,
};

export const TIER_THRESHOLDS = {
  holder: 1_000,   // ≥1,000 $LUCA
  whale:  10_000,  // ≥10,000 $LUCA
};

export const TIER_LABELS: Record<LucaTier, string> = {
  free:   "Free",
  holder: "Developer",
  whale:  "Enterprise",
};

export const LUCA_TOKEN_ADDRESS = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";

// 1-hour in-memory balance cache keyed by wallet address
const balanceCache = new Map<string, { balance: number; ts: number }>();
const CACHE_TTL = 60 * 60 * 1_000; // 1 hour

export async function getLucaBalance(walletAddress: string): Promise<number> {
  const addr = walletAddress.toLowerCase();
  const cached = balanceCache.get(addr);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.balance;

  const tokenAddress =
    process.env.LUCA_TOKEN_ADDRESS ??
    LUCA_TOKEN_ADDRESS;
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) return 0;

  try {
    const res = await fetch(
      `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getTokenBalances",
          params: [addr, [tokenAddress]],
        }),
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!res.ok) return 0;

    type AlchemyBalanceResult = {
      result?: {
        tokenBalances?: { tokenBalance?: string }[];
      };
    };

    const data = await res.json() as AlchemyBalanceResult;
    const hex = data.result?.tokenBalances?.[0]?.tokenBalance ?? "0x0";
    const decimals = 18; // $LUCA is standard ERC-20 with 18 decimals
    const raw = BigInt(hex === "0x" ? "0x0" : hex);
    const balance = Number(raw) / 10 ** decimals;

    balanceCache.set(addr, { balance, ts: Date.now() });
    return balance;
  } catch {
    return 0;
  }
}

export function balanceToTier(balance: number): LucaTier {
  if (balance >= TIER_THRESHOLDS.whale) return "whale";
  if (balance >= TIER_THRESHOLDS.holder) return "holder";
  return "free";
}

export async function getWalletTier(walletAddress: string): Promise<{ tier: LucaTier; balance: number }> {
  const balance = await getLucaBalance(walletAddress);
  return { tier: balanceToTier(balance), balance };
}
