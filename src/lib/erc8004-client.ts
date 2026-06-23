const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const REPUTATION_REGISTRY  = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const BASE_RPC = "https://base-mainnet.g.alchemy.com/v2";
const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_ADDRESS_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000";

const SEL = {
  tokenURI:       "0xc87b56dd",
  ownerOf:        "0x6352211e",
  getAgentWallet: "0xa65f7af1",
};

export type Erc8004RawAgent = {
  agentId: string;
  registryAddress: string;
  ownerAddress: string;
  metadataUri: string | null;
  agentWallet: string | null;
  metadata: Erc8004Metadata | null;
  metadataError: string | null;
  registrationTx: string | null;
};

export type Erc8004Metadata = {
  name?: string;
  description?: string;
  image?: string;
  // Identity
  did?: string;                // did:erc8004:... or did:pkh:...
  operator?: string;           // operator identifier or address
  // Capabilities & endpoints
  capabilities?: string[];
  endpoints?: Array<{ type: string; url: string; [k: string]: unknown }>;
  // Financial — paymentAddress is a candidate only, NEVER auto books-eligible
  paymentAddress?: string;
  // Social handles
  socials?: Array<{ platform: string; handle: string; url?: string }>;
  // Standard ERC-8004
  services?: Array<{ type: string; url: string; [k: string]: unknown }>;
  active?: boolean;
  registrations?: Array<{ agentId: string; agentRegistry: string }>;
  [k: string]: unknown;
};

async function rpc(
  apiKey: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(`${BASE_RPC}/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  const json = await res.json() as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

function encodeUint256Call(selector: string, id: bigint): string {
  return selector + id.toString(16).padStart(64, "0");
}

function decodeString(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length < 128) return "";
  const lengthHex = clean.slice(64, 128);
  const byteLength = parseInt(lengthHex, 16);
  if (byteLength === 0) return "";
  const dataHex = clean.slice(128, 128 + byteLength * 2);
  const bytes = new Uint8Array(dataHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []);
  return new TextDecoder().decode(bytes);
}

function decodeAddress(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length < 64) return "0x0000000000000000000000000000000000000000";
  return "0x" + clean.slice(24, 64).toLowerCase();
}

async function ethCall(apiKey: string, to: string, data: string): Promise<string | null> {
  try {
    const result = await rpc(apiKey, "eth_call", [{ to, data }, "latest"]);
    const s = result as string;
    return s && s !== "0x" && s !== "0x0" ? s : null;
  } catch {
    return null;
  }
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

async function fetchAgentDetails(
  agentId: bigint,
  registrationTx: string | null,
  apiKey: string,
): Promise<Erc8004RawAgent> {
  const idStr = agentId.toString();

  const [tokenUriResult, ownerResult, walletResult] = await Promise.allSettled([
    ethCall(apiKey, IDENTITY_REGISTRY, encodeUint256Call(SEL.tokenURI, agentId)),
    ethCall(apiKey, IDENTITY_REGISTRY, encodeUint256Call(SEL.ownerOf, agentId)),
    ethCall(apiKey, IDENTITY_REGISTRY, encodeUint256Call(SEL.getAgentWallet, agentId)),
  ]);

  const rawTokenUri = tokenUriResult.status === "fulfilled" ? tokenUriResult.value : null;
  const rawOwner   = ownerResult.status === "fulfilled"   ? ownerResult.value   : null;
  const rawWallet  = walletResult.status === "fulfilled"  ? walletResult.value  : null;

  const metadataUri = rawTokenUri ? decodeString(rawTokenUri) : null;
  const ownerAddress = rawOwner ? decodeAddress(rawOwner) : ZERO_ADDR;

  let agentWallet: string | null = null;
  if (rawWallet) {
    const decoded = decodeAddress(rawWallet);
    if (decoded !== ZERO_ADDR) {
      agentWallet = decoded;
    }
  }

  let metadata: Erc8004Metadata | null = null;
  let metadataError: string | null = null;

  if (metadataUri) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(metadataUri, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        metadata = await res.json() as Erc8004Metadata;
      } else {
        metadataError = `HTTP ${res.status}`;
      }
    } catch (e) {
      metadataError = e instanceof Error ? e.message : "Fetch failed";
    }
  }

  return {
    agentId: idStr,
    registryAddress: IDENTITY_REGISTRY,
    ownerAddress,
    metadataUri: metadataUri || null,
    agentWallet,
    metadata,
    metadataError,
    registrationTx,
  };
}

const MAX_BLOCK_RANGE = 50_000;

async function getLogsWithPagination(
  apiKey: string,
  fromBlock: string,
  toBlock: string,
): Promise<Array<{ topics: string[]; transactionHash: string }>> {
  // Resolve "latest" to a real block number
  let toNum: number;
  if (toBlock === "latest") {
    const blockNum = await rpc(apiKey, "eth_blockNumber", []);
    toNum = parseInt(blockNum as string, 16);
  } else {
    toNum = parseInt(toBlock, 16);
  }
  const fromNum = parseInt(fromBlock, 16);

  const allLogs: Array<{ topics: string[]; transactionHash: string }> = [];
  for (let start = fromNum; start <= toNum; start += MAX_BLOCK_RANGE) {
    const end = Math.min(start + MAX_BLOCK_RANGE - 1, toNum);
    try {
      const result = await rpc(apiKey, "eth_getLogs", [{
        address: IDENTITY_REGISTRY,
        topics: [TRANSFER_TOPIC0, ZERO_ADDRESS_TOPIC],
        fromBlock: "0x" + start.toString(16),
        toBlock:   "0x" + end.toString(16),
      }]);
      const chunk = result as typeof allLogs;
      allLogs.push(...chunk);
    } catch {
      // skip failed chunk, continue
    }
  }
  return allLogs;
}

export async function fetchAllErc8004Agents(
  apiKey: string,
  fromBlock: string = "0xE4E1C0",
  toBlock: string = "latest",
): Promise<Erc8004RawAgent[]> {
  const logs = await getLogsWithPagination(apiKey, fromBlock, toBlock);

  // Deduplicate by agentId — last log wins (highest block = most recent mint event)
  const seen = new Map<string, string>();
  for (const log of logs) {
    if (!log.topics[2]) continue;
    const agentId = BigInt("0x" + log.topics[2].slice(2)).toString();
    seen.set(agentId, log.transactionHash);
  }

  const entries = [...seen.entries()];
  const CONCURRENCY = 5;
  const results: Erc8004RawAgent[] = [];

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(([idStr, txHash]) => fetchAgentDetails(BigInt(idStr), txHash, apiKey)),
    );
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(s.value);
    }
    if (i + CONCURRENCY < entries.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

export async function fetchErc8004AgentsByIds(
  agentIds: string[],
  apiKey: string,
): Promise<Erc8004RawAgent[]> {
  const settled = await Promise.allSettled(
    agentIds.map((id) => fetchAgentDetails(BigInt(id), null, apiKey)),
  );
  return settled
    .filter((s): s is PromiseFulfilledResult<Erc8004RawAgent> => s.status === "fulfilled")
    .map((s) => s.value);
}

export async function fetchErc8004AgentById(
  agentId: string,
  apiKey: string,
): Promise<Erc8004RawAgent> {
  return fetchAgentDetails(BigInt(agentId), null, apiKey);
}
