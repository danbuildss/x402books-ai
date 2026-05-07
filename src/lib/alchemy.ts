import {
  BASE_USDC_ADDRESS,
  LedgerTransaction,
  TimeRange,
  getRangeStart,
} from "@/lib/ledger";

type AlchemyTransfer = {
  hash: string;
  from: string;
  to: string;
  value?: number;
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
  const decimals = Number(transfer.rawContract?.decimal || 6);

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
          category: ["erc20"],
          contractAddresses: [BASE_USDC_ADDRESS],
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

export async function fetchBaseUsdcTransfers(params: {
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

      return {
        txHash: transfer.hash,
        timestamp,
        amountUsdc: parseTokenAmount(transfer),
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
