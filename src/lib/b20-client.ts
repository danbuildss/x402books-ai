// B20 token metadata fetcher, activity scanner, and issuer → agent linker.
//
// Data integrity constraints enforced here:
//   - token contract is NEVER books-eligible
//   - token transfers are NOT operating revenue
//   - issuer wallet is NOT attributed unless manifest-confirmed
//   - B20 activity does NOT enter Agent GDP

const CHAIN_RPC: Record<B20Chain, string> = {
  "base":         "https://base-mainnet.g.alchemy.com/v2",
  "base-sepolia": "https://base-sepolia.g.alchemy.com/v2",
};

export type B20Chain = "base" | "base-sepolia";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ERC20_SEL = {
  name:        "0x06fdde03",
  symbol:      "0x95d89b41",
  decimals:    "0x313ce567",
  totalSupply: "0x18160ddd",
  owner:       "0x8da5cb5b",
};

export type B20TokenIdentity = {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  issuerWallet: string | null;
  ownerWallet: string | null;
  deploymentTx: string | null;
  deployedBlock: number | null;
  metadataUri: string | null;
  chain: B20Chain;
  isTestnet: boolean;
};

export type B20AgentLink = {
  method: "manifest" | "known_token" | "erc8004" | "admin" | "none";
  confidence: "confirmed" | "inferred" | "candidate";
  agentName: string | null;
  agentSlug: string | null;
  note: string | null;
};

export type B20ActivitySummary = {
  tokenAddress: string;
  mintCount: number;
  burnCount: number;
  mintVolumeRaw: string;
  burnVolumeRaw: string;
  recentMints: B20ActivityEvent[];
  recentBurns: B20ActivityEvent[];
  lastActivityAt: string | null;
};

export type B20ActivityEvent = {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  amountRaw: string;
  timestamp: string | null;
  eventType: "mint" | "burn";
};

type AlchemyContractMeta = {
  address?: string;
  contractMetadata?: {
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
    contractDeployer?: string;
    deployedBlockNumber?: number;
  };
};

type AlchemyTransferItem = {
  hash: string;
  blockNum: string;
  from: string;
  to: string | null;
  value: number | null;
  rawContract?: { value?: string };
  metadata?: { blockTimestamp?: string };
};

type AlchemyTransfersResult = {
  transfers?: AlchemyTransferItem[];
  pageKey?: string;
};

// ── helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function rpcUrl(apiKey: string, chain: B20Chain): string {
  return `${CHAIN_RPC[chain]}/${apiKey}`;
}

async function rpc(apiKey: string, method: string, params: unknown[], chain: B20Chain = "base"): Promise<unknown> {
  const res = await fetch(rpcUrl(apiKey, chain), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  const json = await res.json() as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

async function ethCall(apiKey: string, to: string, data: string, chain: B20Chain = "base"): Promise<string | null> {
  try {
    const result = await rpc(apiKey, "eth_call", [{ to, data }, "latest"], chain);
    const s = result as string;
    return s && s !== "0x" && s !== "0x0" ? s : null;
  } catch {
    return null;
  }
}

function decodeString(hex: string): string | null {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length < 128) return null;
  const byteLength = parseInt(clean.slice(64, 128), 16);
  if (byteLength === 0) return null;
  const dataHex = clean.slice(128, 128 + byteLength * 2);
  const bytes = new Uint8Array(dataHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []);
  const s = new TextDecoder().decode(bytes).trim();
  return s || null;
}

function decodeUint8(hex: string): number {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!clean) return 18;
  return parseInt(clean.slice(-2), 16);
}

function decodeUint256(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!clean) return "0";
  return BigInt("0x" + clean).toString();
}

function decodeAddress(hex: string): string | null {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length < 64) return null;
  const addr = "0x" + clean.slice(24, 64).toLowerCase();
  return addr === ZERO_ADDRESS ? null : addr;
}

// ── token identity ────────────────────────────────────────────────────────────

export async function fetchB20TokenIdentity(
  address: string,
  apiKey: string,
  chain: B20Chain = "base",
): Promise<B20TokenIdentity> {
  const addr = address.toLowerCase();

  // Primary: Alchemy contract metadata (includes deployer)
  let alchemyMeta: AlchemyContractMeta["contractMetadata"] | null = null;
  try {
    const result = await rpc(apiKey, "alchemy_getContractMetadata", [addr], chain);
    const meta = result as AlchemyContractMeta;
    alchemyMeta = meta?.contractMetadata ?? null;
  } catch {
    // fall through to eth_call
  }

  // Parallel eth_call fallbacks for fields not in alchemy metadata
  const [nameResult, symbolResult, decimalsResult, supplyResult, ownerResult] =
    await Promise.allSettled([
      ethCall(apiKey, addr, ERC20_SEL.name, chain),
      ethCall(apiKey, addr, ERC20_SEL.symbol, chain),
      ethCall(apiKey, addr, ERC20_SEL.decimals, chain),
      ethCall(apiKey, addr, ERC20_SEL.totalSupply, chain),
      ethCall(apiKey, addr, ERC20_SEL.owner, chain),
    ]);

  const nameHex   = nameResult.status   === "fulfilled" ? nameResult.value   : null;
  const symbolHex = symbolResult.status === "fulfilled" ? symbolResult.value : null;
  const decHex    = decimalsResult.status === "fulfilled" ? decimalsResult.value : null;
  const supplyHex = supplyResult.status === "fulfilled" ? supplyResult.value : null;
  const ownerHex  = ownerResult.status === "fulfilled" ? ownerResult.value : null;

  const name    = alchemyMeta?.name   ?? (nameHex   ? decodeString(nameHex)   : null);
  const symbol  = alchemyMeta?.symbol ?? (symbolHex ? decodeString(symbolHex) : null);
  const decimals = decHex ? decodeUint8(decHex) : 18;
  const totalSupply = alchemyMeta?.totalSupply ?? (supplyHex ? decodeUint256(supplyHex) : null);
  const ownerWallet = ownerHex ? decodeAddress(ownerHex) : null;
  const issuerWallet = alchemyMeta?.contractDeployer?.toLowerCase() ?? null;
  const deployedBlock = alchemyMeta?.deployedBlockNumber ?? null;

  return {
    address: addr,
    name,
    symbol,
    decimals,
    totalSupply,
    issuerWallet,
    ownerWallet,
    deploymentTx: null,
    deployedBlock,
    metadataUri: null,
    chain,
    isTestnet: chain !== "base",
  };
}

// ── activity scanner ─────────────────────────────────────────────────────────

async function fetchTransfersFrom(
  tokenAddress: string,
  fromAddress: string,
  apiKey: string,
  maxPages = 3,
  chain: B20Chain = "base",
): Promise<AlchemyTransferItem[]> {
  const results: AlchemyTransferItem[] = [];
  let pageKey: string | undefined;
  let page = 0;

  do {
    page++;
    const params: Record<string, unknown> = {
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress,
      contractAddresses: [tokenAddress],
      category: ["erc20"],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: "0x64",
    };
    if (pageKey) params.pageKey = pageKey;

    try {
      const result = await rpc(apiKey, "alchemy_getAssetTransfers", [params], chain);
      const data = result as AlchemyTransfersResult;
      results.push(...(data.transfers ?? []));
      pageKey = data.pageKey;
    } catch {
      break;
    }
  } while (pageKey && page < maxPages);

  return results;
}

export async function fetchB20Activity(
  tokenAddress: string,
  apiKey: string,
  chain: B20Chain = "base",
): Promise<B20ActivitySummary> {
  const addr = tokenAddress.toLowerCase();

  // Mint: transfer FROM zero address
  // Burns: scan recent transfers and filter for to === ZERO_ADDRESS
  const [mintTransfers, allRecentTransfers] = await Promise.allSettled([
    fetchTransfersFrom(addr, ZERO_ADDRESS, apiKey, 3, chain),
    fetchTransfersFrom(addr, "0x0000000000000000000000000000000000000001", apiKey, 1, chain),
  ]);

  const mints = mintTransfers.status === "fulfilled" ? mintTransfers.value : [];
  const allRecent = allRecentTransfers.status === "fulfilled" ? allRecentTransfers.value : [];
  const burns = allRecent.filter((t) => t.to?.toLowerCase() === ZERO_ADDRESS);

  function sumRaw(items: AlchemyTransferItem[]): string {
    let total = BigInt(0);
    for (const t of items) {
      const raw = t.rawContract?.value ?? "0x0";
      try { total += BigInt(raw === "0x" ? "0x0" : raw); } catch { /* skip */ }
    }
    return total.toString();
  }

  function toEvent(t: AlchemyTransferItem, type: "mint" | "burn"): B20ActivityEvent {
    return {
      txHash: t.hash,
      blockNumber: parseInt(t.blockNum, 16),
      from: t.from?.toLowerCase() ?? ZERO_ADDRESS,
      to: t.to?.toLowerCase() ?? ZERO_ADDRESS,
      amountRaw: t.rawContract?.value ?? "0",
      timestamp: t.metadata?.blockTimestamp ?? null,
      eventType: type,
    };
  }

  const recentMints = mints.slice(0, 10).map((t) => toEvent(t, "mint"));
  const recentBurns = burns.slice(0, 10).map((t) => toEvent(t, "burn"));

  const timestamps = [...recentMints, ...recentBurns]
    .map((e) => e.timestamp)
    .filter(Boolean) as string[];
  const lastActivityAt = timestamps.length > 0
    ? timestamps.sort().reverse()[0]
    : null;

  return {
    tokenAddress: addr,
    mintCount: mints.length,
    burnCount: burns.length,
    mintVolumeRaw: sumRaw(mints),
    burnVolumeRaw: sumRaw(burns),
    recentMints,
    recentBurns,
    lastActivityAt,
  };
}

// ── issuer → agent linker ─────────────────────────────────────────────────────

type LinkableAgent = {
  name: string;
  tokenAddress: string | null;
  wallets: Array<{ address: string; evidenceSource?: string }>;
  erc8004AgentId?: string;
};

export function linkTokenToAgent(
  tokenAddress: string,
  issuerWallet: string | null,
  agents: LinkableAgent[],
): B20AgentLink {
  const addrLower = tokenAddress.toLowerCase();
  const issuerLower = (issuerWallet ?? "").toLowerCase();

  // 1. known_token: this IS the registered token address for an agent
  const byToken = agents.find((a) => a.tokenAddress?.toLowerCase() === addrLower);
  if (byToken) {
    return {
      method: "known_token",
      confidence: "confirmed",
      agentName: byToken.name,
      agentSlug: toSlug(byToken.name),
      note: "Token address matches agent tokenAddress in Zetta registry",
    };
  }

  if (issuerLower && issuerLower !== ZERO_ADDRESS) {
    // 2. manifest: issuer wallet is manifest-declared for an agent
    const byManifest = agents.find((a) =>
      (a.wallets ?? []).some(
        (w) =>
          (w.evidenceSource ?? "").toLowerCase() === "manifest" &&
          w.address.toLowerCase() === issuerLower,
      ),
    );
    if (byManifest) {
      return {
        method: "manifest",
        confidence: "confirmed",
        agentName: byManifest.name,
        agentSlug: toSlug(byManifest.name),
        note: "Issuer wallet is manifest-declared for this agent",
      };
    }

    // 3. candidate: issuer wallet appears in any agent's wallet list (not manifest-declared)
    // method stays "none" — no confirmed link method exists until .agent/wallets.json is submitted
    const byWallet = agents.find((a) =>
      (a.wallets ?? []).some((w) => w.address.toLowerCase() === issuerLower),
    );
    if (byWallet) {
      return {
        method: "none",
        confidence: "candidate",
        agentName: byWallet.name,
        agentSlug: toSlug(byWallet.name),
        note: "Issuer wallet is in agent wallet list but not manifest-declared — submit .agent/wallets.json to confirm",
      };
    }
  }

  return {
    method: "none",
    confidence: "candidate",
    agentName: null,
    agentSlug: null,
    note: null,
  };
}

export function deriveManifestStatus(link: B20AgentLink): "attributed" | "candidate" | "none" {
  if (link.confidence === "confirmed" && (link.method === "manifest" || link.method === "known_token")) {
    return "attributed";
  }
  if (link.agentName !== null) return "candidate";
  return "none";
}

export function buildLucaSummary(
  token: B20TokenIdentity,
  link: B20AgentLink,
  manifestStatus: "attributed" | "candidate" | "none",
  activity: B20ActivitySummary | null,
  isTestnet = false,
): string {
  const name = token.name ?? token.symbol ?? token.address.slice(0, 10);
  const parts: string[] = [];

  if (link.agentName) {
    parts.push(
      `${name} is a B20 token linked to ${link.agentName} (${link.confidence} via ${link.method}).`,
    );
  } else {
    parts.push(`${name} is a B20 token with no linked agent in the Zetta registry.`);
  }

  if (manifestStatus === "attributed") {
    parts.push("The issuer is manifest-attributed.");
  } else if (manifestStatus === "candidate") {
    parts.push(
      "The issuer wallet is a candidate match but not yet manifest-declared. Financial books require .agent/wallets.json attribution.",
    );
  } else {
    parts.push("No wallet manifest found. B20 indexed, but financial books require wallet attribution.");
  }

  if (activity) {
    if (activity.mintCount > 0) {
      parts.push(`${activity.mintCount} mint event${activity.mintCount !== 1 ? "s" : ""} recorded.`);
    }
    if (activity.burnCount > 0) {
      parts.push(`${activity.burnCount} burn event${activity.burnCount !== 1 ? "s" : ""} recorded.`);
    }
  }

  if (isTestnet) {
    parts.push(
      "⚠ This is a testnet B20 token (Base Sepolia). It is not production financial activity. It does not enter Agent Books, Agent GDP, or production B20 intelligence.",
    );
  }

  parts.push(
    "Token transfers are not operating revenue. Token contract is not an operator wallet. B20 activity is excluded from Agent GDP.",
  );

  return parts.join(" ");
}
