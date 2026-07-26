import type { FetchParams, NormalizedTransaction } from "../chain-fetcher";
import { stablecoinUsd } from "../usd-pricer";

const CHAIN_ENDPOINTS: Record<string, string> = {
  base:      "https://base-mainnet.g.alchemy.com/v2",
  ethereum:  "https://eth-mainnet.g.alchemy.com/v2",
  arbitrum:  "https://arb-mainnet.g.alchemy.com/v2",
  optimism:  "https://opt-mainnet.g.alchemy.com/v2",
  polygon:   "https://polygon-mainnet.g.alchemy.com/v2",
};

interface AlchemyTransfer {
  blockNum:    string;
  hash:        string;
  from:        string;
  to:          string | null;
  value:       number | null;
  asset:       string | null;
  category:    string;
  rawContract: {
    value:   string | null;
    address: string | null;
    decimal: string | null;
  };
  metadata?: {
    blockTimestamp?: string;
  };
}

interface AlchemyResponse {
  result?: {
    transfers?: AlchemyTransfer[];
    pageKey?:   string;
  };
  error?: { message: string };
}

async function callAlchemy(
  url:     string,
  params:  Record<string, unknown>,
): Promise<AlchemyTransfer[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id:      1,
        jsonrpc: "2.0",
        method:  "alchemy_getAssetTransfers",
        params:  [params],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Alchemy HTTP ${res.status}`);
    const json = await res.json() as AlchemyResponse;
    if (json.error) throw new Error(`Alchemy RPC error: ${json.error.message}`);
    return json.result?.transfers ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAlchemy(params: FetchParams): Promise<NormalizedTransaction[]> {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY not set");

  const endpointBase = CHAIN_ENDPOINTS[params.chain];
  if (!endpointBase) throw new Error(`Alchemy: unsupported chain "${params.chain}"`);

  const url       = `${endpointBase}/${key}`;
  const addr      = params.address.toLowerCase();
  const maxCount  = `0x${Math.min(params.limit ?? 500, 1000).toString(16)}`;
  const fromBlock = params.fromBlock ? `0x${params.fromBlock.toString(16)}` : "0x0";

  const shared = {
    fromBlock,
    category:         ["external", "erc20"],
    withMetadata:     true,
    excludeZeroValue: true,
    maxCount,
  };

  // Two parallel calls: inbound (toAddress) and outbound (fromAddress)
  const [inbound, outbound] = await Promise.all([
    callAlchemy(url, { ...shared, toAddress:   addr }),
    callAlchemy(url, { ...shared, fromAddress: addr }),
  ]);

  const seen    = new Set<string>();
  const results: NormalizedTransaction[] = [];

  const toNormalized = (
    transfers: AlchemyTransfer[],
    direction: "inbound" | "outbound",
  ) => {
    for (const t of transfers) {
      if (!t.to || !t.from) continue;

      const key = `${t.hash.toLowerCase()}:${direction}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const decStr  = t.rawContract?.decimal;
      const rawVal  = t.rawContract?.value ?? "0x0";
      const assetAddress = t.rawContract?.address?.toLowerCase() ?? undefined;
      const decimals = decStr != null ? parseInt(decStr, 10) : undefined;
      const valueUsd = stablecoinUsd(assetAddress, params.chain, rawVal, decimals);

      results.push({
        txHash:       t.hash.toLowerCase(),
        blockNumber:  parseInt(t.blockNum, 16),
        timestamp:    t.metadata?.blockTimestamp ?? new Date(0).toISOString(),
        direction,
        from:         t.from.toLowerCase(),
        to:           t.to.toLowerCase(),
        assetSymbol:  t.asset ?? "UNKNOWN",
        assetAddress,
        rawValue:     rawVal,
        valueUsd,
        isERC20:      t.category === "erc20",
        chain:        params.chain,
      });
    }
  };

  toNormalized(inbound,  "inbound");
  toNormalized(outbound, "outbound");

  return results;
}
