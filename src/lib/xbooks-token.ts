// $XBOOKS token balance checker and tier calculator.
// Uses Alchemy alchemy_getTokenBalances — no ABI encoding needed.

export type XBooksTier = "free" | "holder" | "whale";

export const TIER_LIMITS: Record<XBooksTier, number> = {
  free:   100,
  holder: 500,
  whale:  2_000,
};

export const TIER_THRESHOLDS = {
  holder: 1_000,   // ≥1,000 XBOOKS
  whale:  10_000,  // ≥10,000 XBOOKS
};

export const TIER_LABELS: Record<XBooksTier, string> = {
  free:   "Free",
  holder: "Holder",
  whale:  "Whale",
};

// 1-hour in-memory balance cache keyed by wallet address
const balanceCache = new Map<string, { balance: number; ts: number }>();
const CACHE_TTL = 60 * 60 * 1_000; // 1 hour

export async function getXBooksBalance(walletAddress: string): Promise<number> {
  const addr = walletAddress.toLowerCase();
  const cached = balanceCache.get(addr);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.balance;

  const tokenAddress = process.env.XBOOKS_TOKEN_ADDRESS ?? "0x031d1a44785ef5e0bef61e226199122c5e1e4f02";
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
    // XBOOKS uses 18 decimals (standard ERC-20)
    const decimals = parseInt(process.env.XBOOKS_TOKEN_DECIMALS ?? "18", 10);
    const raw = BigInt(hex === "0x" ? "0x0" : hex);
    const balance = Number(raw) / 10 ** decimals;

    balanceCache.set(addr, { balance, ts: Date.now() });
    return balance;
  } catch {
    return 0;
  }
}

export function balanceToTier(balance: number): XBooksTier {
  if (balance >= TIER_THRESHOLDS.whale) return "whale";
  if (balance >= TIER_THRESHOLDS.holder) return "holder";
  return "free";
}

export async function getWalletTier(walletAddress: string): Promise<{ tier: XBooksTier; balance: number }> {
  const balance = await getXBooksBalance(walletAddress);
  return { tier: balanceToTier(balance), balance };
}
