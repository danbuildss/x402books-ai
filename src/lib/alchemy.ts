import {
  LedgerTransaction,
  TimeRange,
  getRangeStart,
} from "@/lib/ledger";
import { isStablecoin, isAgentToken } from "@/lib/tokens";

// Resolve a token contract to its deployer wallet via Alchemy.
// If the address is already an EOA (code === "0x"), returns it unchanged.
export async function resolveToWallet(
  address: string,
  apiKey: string,
): Promise<string> {
  const addr = address.toLowerCase();
  try {
    // Check if it's a contract
    const codeRes = await fetch(`${BASE_ALCHEMY_URL}/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1, jsonrpc: "2.0", method: "eth_getCode",
        params: [addr, "latest"],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const codeBody = await codeRes.json() as { result?: string };
    // "0x" means no contract code — it's a plain wallet
    if (!codeBody.result || codeBody.result === "0x") return addr;

    // It's a contract — find the deploying transaction (first external transfer to it)
    const deployRes = await fetch(`${BASE_ALCHEMY_URL}/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 2, jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [{
          toAddress: addr,
          category: ["external"],
          fromBlock: "0x0",
          maxCount: "0x1",
          order: "asc",
          withMetadata: false,
        }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const deployBody = await deployRes.json() as {
      result?: { transfers?: Array<{ from?: string }> };
    };
    const deployer = deployBody.result?.transfers?.[0]?.from?.toLowerCase();
    return deployer ?? addr;
  } catch {
    return addr;
  }
}

type AlchemyTransfer = {
  hash: string;
  from: string;
  to: string;
  value?: number;
  asset?: string;
  metadata?: {
    blockTimestamp?: string;
  };
  rawContract?: {
    value?: string;
    decimal?: string;
    address?: string;
  };
};

type AlchemyResponse = {
  result?: {
    transfers?: AlchemyTransfer[];
    pageKey?: string;
  };
  error?: {
    message?: string;
  };
};

const BASE_ALCHEMY_URL = "https://base-mainnet.g.alchemy.com/v2";

function parseTokenAmount(transfer: AlchemyTransfer) {
  const rawValue = transfer.rawContract?.value;
  // Default to 18 decimals (ERC-20 standard). USDC/USDT are exceptions at 6.
  const decimals = Number(transfer.rawContract?.decimal ?? 18);

  if (!rawValue) {
    return Number(transfer.value || 0);
  }

  const units = BigInt(rawValue);
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = units / divisor;
  const fraction = (units % divisor).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");

  return Number(`${whole.toString()}.${trimmedFraction || "0"}`);
}

async function fetchAlchemyTransfers(params: {
  apiKey: string;
  wallet: string;
  direction: "income" | "expense";
  pageKey?: string;
}) {
  const addressParam =
    params.direction === "income"
      ? { toAddress: params.wallet }
      : { fromAddress: params.wallet };

  const response = await fetch(`${BASE_ALCHEMY_URL}/${params.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [
        {
          ...addressParam,
          category: ["erc20", "external"],
          excludeZeroValue: true,
          fromBlock: "0x0",
          maxCount: "0x3e8",
          order: "desc",
          pageKey: params.pageKey,
          toBlock: "latest",
          withMetadata: true,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Alchemy request failed.");
  }

  const body = (await response.json()) as AlchemyResponse;
  if (body.error?.message) {
    throw new Error(body.error.message);
  }

  return body.result || { transfers: [] };
}

async function fetchDirection(params: {
  apiKey: string;
  wallet: string;
  direction: "income" | "expense";
}) {
  const transfers: AlchemyTransfer[] = [];
  let pageKey: string | undefined;
  let pageCount = 0;

  do {
    const result = await fetchAlchemyTransfers({
      ...params,
      pageKey,
    });

    transfers.push(...(result.transfers || []));
    pageKey = result.pageKey;
    pageCount += 1;
  } while (pageKey && pageCount < 3);

  return transfers;
}

export async function fetchBaseErc20Transfers(params: {
  apiKey: string;
  wallet: string;
  range: TimeRange;
}): Promise<LedgerTransaction[]> {
  const wallet = params.wallet.toLowerCase();
  const [incoming, outgoing] = await Promise.all([
    fetchDirection({ apiKey: params.apiKey, wallet, direction: "income" }),
    fetchDirection({ apiKey: params.apiKey, wallet, direction: "expense" }),
  ]);

  const rangeStart = getRangeStart(params.range);
  const seen = new Set<string>();

  return [...incoming, ...outgoing]
    .map((transfer) => {
      const from = transfer.from.toLowerCase();
      const to = transfer.to.toLowerCase();
      const direction =
        from === wallet && to === wallet ? "internal" : to === wallet ? "income" : "expense";
      const timestamp = transfer.metadata?.blockTimestamp || new Date().toISOString();

      const tokenSymbol = transfer.asset || "UNKNOWN";
      // ETH (external category) has no rawContract.address — use the native ETH sentinel
      const tokenAddress = (transfer.rawContract?.address || "").toLowerCase() || (tokenSymbol === "ETH" ? "eth" : "");
      return {
        txHash: transfer.hash,
        timestamp,
        amountUsdc: parseTokenAmount(transfer),
        tokenSymbol,
        tokenAddress,
        usdValue: isStablecoin(tokenAddress) ? parseTokenAmount(transfer) : 0,
        isAgentToken: isAgentToken(tokenSymbol),
        direction,
        counterparty: direction === "income" ? from : to,
        from,
        to,
      } satisfies LedgerTransaction;
    })
    .filter((transaction) => {
      const transferTime = new Date(transaction.timestamp).getTime();
      return Number.isFinite(transferTime) && transferTime >= rangeStart;
    })
    .filter((transaction) => {
      const key = `${transaction.txHash}-${transaction.from}-${transaction.to}-${transaction.amountUsdc}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
}
