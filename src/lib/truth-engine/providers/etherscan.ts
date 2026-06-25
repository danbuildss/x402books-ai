import type { FetchParams, NormalizedTransaction } from "../chain-fetcher";

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
    const json = await res.json() as EtherscanResponse;
    if (json.status !== "1") return [];
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

      results.push({
        txHash:       tx.hash.toLowerCase(),
        blockNumber:  parseInt(tx.blockNumber, 10),
        timestamp:    new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString(),
        direction,
        from:         tx.from.toLowerCase(),
        to:           tx.to.toLowerCase(),
        assetSymbol:  tx.tokenSymbol ?? "ETH",
        assetAddress: tx.contractAddress?.toLowerCase() ?? undefined,
        rawValue:     tx.value,
        valueUsd:     undefined,
        isERC20,
        chain:        params.chain,
      });
    }
  };

  process(nativeTxs, false);
  process(tokenTxs,  true);

  return results;
}
