// Provider-agnostic chain data fetcher.
// Tries Alchemy first. Falls back to Etherscan/Basescan if Alchemy fails or key is missing.
// Never throws — always returns a FetchResult with an optional error field.

import { fetchAlchemy } from "./providers/alchemy";
import { fetchEtherscan } from "./providers/etherscan";

export interface NormalizedTransaction {
  txHash:        string;
  blockNumber:   number;
  timestamp:     string;        // ISO 8601
  direction:     "inbound" | "outbound";
  from:          string;        // lowercase
  to:            string;        // lowercase
  assetSymbol:   string;        // "ETH", "USDC", etc.
  assetAddress?: string;        // ERC-20 contract address, lowercase
  rawValue:      string;        // raw on-chain value (wei / token units)
  valueUsd?:     number;        // USD value if available
  isERC20:       boolean;
  chain:         string;
}

export interface FetchParams {
  address:    string;           // wallet to index (will be lowercased)
  chain:      "base" | "ethereum" | "arbitrum" | "optimism" | "polygon";
  fromBlock?: number;           // optional start block
  limit?:     number;           // per-direction cap, default 500
}

export interface FetchResult {
  transactions: NormalizedTransaction[];
  provider:     "alchemy" | "etherscan" | "none";
  error?:       string;         // present when fallback used or both failed
  // True when the number of returned transactions reached the per-direction
  // cap — older activity likely exists that was not fetched, so any totals
  // built from this result may be incomplete.
  truncated?:   boolean;
}

export async function fetchWalletTransactions(params: FetchParams): Promise<FetchResult> {
  const hasAlchemy   = Boolean(process.env.ALCHEMY_API_KEY);
  const hasEtherscan = Boolean(process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY);

  const cap = params.limit ?? 500;
  const isTruncated = (txs: NormalizedTransaction[]) => txs.length >= cap;

  if (hasAlchemy) {
    try {
      const transactions = await fetchAlchemy(params);
      return { transactions, provider: "alchemy", truncated: isTruncated(transactions) };
    } catch (alchemyErr) {
      const alchemyMsg = String(alchemyErr);
      if (!hasEtherscan) {
        return {
          transactions: [],
          provider: "none",
          error: `Alchemy failed: ${alchemyMsg}. No fallback key configured.`,
        };
      }
      try {
        const transactions = await fetchEtherscan(params);
        return {
          transactions,
          provider: "etherscan",
          error: `Alchemy unavailable (${alchemyMsg}), used Etherscan fallback.`,
          truncated: isTruncated(transactions),
        };
      } catch (ethErr) {
        return {
          transactions: [],
          provider: "none",
          error: `Alchemy: ${alchemyMsg} | Etherscan: ${String(ethErr)}`,
        };
      }
    }
  }

  if (hasEtherscan) {
    try {
      const transactions = await fetchEtherscan(params);
      return { transactions, provider: "etherscan", truncated: isTruncated(transactions) };
    } catch (e) {
      return { transactions: [], provider: "none", error: `Etherscan failed: ${String(e)}` };
    }
  }

  return {
    transactions: [],
    provider: "none",
    error: "No provider keys configured. Set ALCHEMY_API_KEY or BASESCAN_API_KEY.",
  };
}
