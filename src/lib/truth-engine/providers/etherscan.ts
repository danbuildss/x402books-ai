import type { FetchParams, NormalizedTransaction } from "../chain-fetcher";
import { stablecoinUsd } from "../usd-pricer";

const CHAIN_APIS: Record<string, string> = {
  base:      "https://api.basescan.org/api",
  ethereum:  "https://api.etherscan.io/api",
  arbitrum:  "https://api.arbiscan.io/api",
  optimism:  "https://api-optimistic.etherscan.io/api",
  polygon:   "https://api.polygonscan.com/api",
};

function resolveApiKey(chain: string): string | undefined {
  if (chain === "base") return process.env.BASESCAN_API_KEY;
  return process.env.ETHERSCAN_API_KEY;
}

interface EtherscanRow {
  hash:              string;
  blockNumber:       string;
  timeStamp:         string;
  from:              string;
  to:                string;
  value:             string;
  isError:           string;
  contractAddress?:  string;  // present for tokentx
  tokenSymbol?:      string;
  tokenDecimal?:     string;
}

interface EtherscanResponse {
  status: string;
  result: EtherscanRow[] | string;
}

// Distinguish a genuinely-empty result from an API error/rate-limit.
// Etherscan returns status "0" for BOTH "no transactions" and errors —
// only the message tells them apart. Empty → [] is honest; an error must
// throw so chain-fetcher records it (P5: rate-limit ≠ empty success).
type EtherscanParse =
  | { kind: "ok" }
  | { kind: "empty" }
  | { kind: "error"; message: string };

export function parseEtherscanStatus(status: string, message: string): EtherscanParse {
  if (status === "1") return { kind: "ok" };
  const msg = (message ?? "").toLowerCase();
  // Known "legitimately empty" signals.
  if (msg.includes("no transactions found") || msg.includes("no records found")) {
    return { kind: "empty" };
  }
  return { kind: "error", message: message || "Etherscan returned status 0" };
}

async function callEtherscan(
  apiUrl:  string,
  action:  string,
  address: string,
  apiKey:  string | undefined,
  limit:   number,
): Promise<EtherscanRow[]> {
  const qs = new URLSearchParams({
    module:  "account",
    action,
    address,
    sort:    "desc",
    page:    "1",
    offset:  String(Math.min(limit, 1000)),
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${apiUrl}?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
    const json = await res.json() as EtherscanResponse & { message?: string };
    const parsed = parseEtherscanStatus(json.status, json.message ?? (typeof json.result === "string" ? json.result : ""));
    if (parsed.kind === "error") throw new Error(`Etherscan ${action}: ${parsed.message}`);
    if (parsed.kind === "empty") return [];
    return Array.isArray(json.result) ? json.result : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchEtherscan(params: FetchParams): Promise<NormalizedTransaction[]> {
  const apiUrl = CHAIN_APIS[params.chain];
  if (!apiUrl) throw new Error(`Etherscan: unsupported chain "${params.chain}"`);

  const apiKey = resolveApiKey(params.chain);
  const addr   = params.address.toLowerCase();
  const limit  = params.limit ?? 500;

  // Two parallel calls: native txs and ERC-20 token transfers
  const [nativeTxs, tokenTxs] = await Promise.all([
    callEtherscan(apiUrl, "txlist",   addr, apiKey, limit),
    callEtherscan(apiUrl, "tokentx",  addr, apiKey, limit),
  ]);

  const seen    = new Set<string>();
  const results: NormalizedTransaction[] = [];

  const process = (rows: EtherscanRow[], isERC20: boolean) => {
    for (const tx of rows) {
      if (tx.isError === "1") continue;

      const direction = tx.from.toLowerCase() === addr ? "outbound" : "inbound";
      const key = `${tx.hash.toLowerCase()}:${direction}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const assetAddress = tx.contractAddress?.toLowerCase() ?? undefined;
      const decimals = tx.tokenDecimal != null ? parseInt(tx.tokenDecimal, 10) : undefined;
      const valueUsd = stablecoinUsd(assetAddress, params.chain, tx.value, decimals);

      results.push({
        txHash:       tx.hash.toLowerCase(),
        blockNumber:  parseInt(tx.blockNumber, 10),
        timestamp:    new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString(),
        direction,
        from:         tx.from.toLowerCase(),
        to:           tx.to.toLowerCase(),
        assetSymbol:  tx.tokenSymbol ?? "ETH",
        assetAddress,
        rawValue:     tx.value,
        valueUsd,
        isERC20,
        chain:        params.chain,
      });
    }
  };

  process(nativeTxs, false);
  process(tokenTxs,  true);

  return results;
}
