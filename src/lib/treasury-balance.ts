// Stable balance fetcher for treasury wallet attribution.
// Fetches USDC + USDT balances on Base via Alchemy.
// ETH is excluded — stablecoin balance is the relevant runway metric.

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // 6 decimals
const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // 6 decimals
const STABLE_DECIMALS = 6;
const ALCHEMY_BASE = "https://base-mainnet.g.alchemy.com/v2";

const _cache = new Map<string, { balance: number; expires: number }>();
const TTL = 10 * 60 * 1000; // 10 minutes

export async function getWalletStableBalance(walletAddress: string): Promise<number> {
  const addr = walletAddress.toLowerCase();
  const cached = _cache.get(addr);
  if (cached && cached.expires > Date.now()) return cached.balance;

  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return 0;

  try {
    const res = await fetch(`${ALCHEMY_BASE}/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [addr, [USDC_BASE, USDT_BASE]],
      }),
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) return 0;

    type AlchemyBalanceResult = {
      result?: { tokenBalances?: Array<{ tokenBalance?: string }> };
    };

    const data = await res.json() as AlchemyBalanceResult;
    const entries = data.result?.tokenBalances ?? [];

    let total = 0;
    for (const entry of entries) {
      const hex = entry.tokenBalance ?? "0x0";
      const raw = BigInt(hex === "0x" ? "0x0" : hex);
      total += Number(raw) / 10 ** STABLE_DECIMALS;
    }

    const balance = Math.round(total * 100) / 100;
    _cache.set(addr, { balance, expires: Date.now() + TTL });
    return balance;
  } catch {
    return 0;
  }
}
