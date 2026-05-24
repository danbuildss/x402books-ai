// Checks whether a Base wallet holds ≥1,000 $LUCA — used for x402 payment discount pricing.
const LUCA_CONTRACT = "0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3";
const LUCA_THRESHOLD = BigInt("1000000000000000000000"); // 1,000 $LUCA (18 decimals)
const BALANCE_OF = "0x70a08231"; // balanceOf(address) selector

export async function hasLucaBalance(wallet: string): Promise<boolean> {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return false;

  try {
    const data = BALANCE_OF + wallet.slice(2).padStart(64, "0");
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: LUCA_CONTRACT, data }, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(3_000),
    });

    if (!res.ok) return false;
    const json = await res.json() as { result?: string };
    if (!json.result || json.result === "0x") return false;
    return BigInt(json.result) >= LUCA_THRESHOLD;
  } catch {
    return false;
  }
}
