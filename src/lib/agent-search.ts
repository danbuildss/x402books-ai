// Server-side agent search across BANKR and Virtuals Protocol ecosystems.

export type AgentResult = {
  name: string;
  symbol: string;
  ecosystem: "BANKR" | "VIRTUALS";
  tokenAddress: string;    // ERC-20 token contract
  walletAddress?: string;  // Agent's operational wallet (if available)
  imageUrl?: string;
  mcap?: number;
};

// ── Virtuals ──────────────────────────────────────────────────────────────────

type VirtualsRaw = {
  id?: number;
  name?: string;
  symbol?: string;
  tokenAddress?: string;
  image?: { url?: string };
  mcap?: number;
  coreContribAddress?: string;
  virtualWalletAddress?: string;
  agentWallet?: string;
  protoWallet?: string;
  attributes?: {
    name?: string;
    symbol?: string;
    tokenAddress?: string;
    coreContribAddress?: string;
    virtualWalletAddress?: string;
    agentWallet?: string;
    protoWallet?: string;
    image?: { data?: { attributes?: { url?: string } } };
    mcap?: number;
  };
};

function parseVirtual(item: VirtualsRaw): AgentResult | null {
  const flat = item.attributes ?? item;
  const name = flat.name ?? item.name ?? "";
  const symbol = (flat.symbol ?? item.symbol ?? "").toUpperCase();
  const tokenAddress = (flat.tokenAddress ?? item.tokenAddress ?? "").toLowerCase();

  if (!tokenAddress.startsWith("0x")) return null;

  const walletAddress = (
    flat.coreContribAddress ??
    flat.virtualWalletAddress ??
    flat.agentWallet ??
    flat.protoWallet ??
    item.coreContribAddress ??
    item.virtualWalletAddress ??
    item.agentWallet ??
    item.protoWallet
  )?.toLowerCase();

  const rawImage =
    (flat as { image?: { url?: string } }).image?.url ??
    (item.attributes?.image as { data?: { attributes?: { url?: string } } } | undefined)
      ?.data?.attributes?.url;
  const imageUrl = rawImage?.startsWith("http") ? rawImage : undefined;

  return {
    name,
    symbol,
    ecosystem: "VIRTUALS",
    tokenAddress,
    walletAddress: walletAddress?.startsWith("0x") ? walletAddress : undefined,
    imageUrl,
    mcap: flat.mcap ?? item.mcap,
  };
}

export async function searchVirtualsAgents(query: string): Promise<AgentResult[]> {
  const results: AgentResult[] = [];
  const q = query.trim().toLowerCase();

  try {
    const nameFilter = `filters[$or][0][name][$containsi]=${encodeURIComponent(query)}`;
    const symFilter = `filters[$or][1][symbol][$containsi]=${encodeURIComponent(query)}`;
    const url =
      `https://api.virtuals.io/api/virtuals` +
      `?${nameFilter}&${symFilter}` +
      `&filters[status][$eq]=LAUNCHED` +
      `&pagination[pageSize]=8&sort=mcap:desc&populate=*`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: "https://app.virtuals.io",
        Origin: "https://app.virtuals.io",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return results;

    const body = await res.json() as { data?: VirtualsRaw[] };
    for (const item of body.data ?? []) {
      // Also match by symbol exactly if the filter is loose
      const sym = (item.symbol ?? item.attributes?.symbol ?? "").toLowerCase();
      const name = (item.name ?? item.attributes?.name ?? "").toLowerCase();
      if (!sym.includes(q) && !name.includes(q)) continue;

      const parsed = parseVirtual(item);
      if (parsed) results.push(parsed);
    }
  } catch {
    // non-fatal
  }

  return results;
}

// ── BANKR ─────────────────────────────────────────────────────────────────────

type BankrSearchItem = {
  address?: string;
  walletAddress?: string;
  wallet?: string;
  symbol?: string;
  ticker?: string;
  name?: string;
  username?: string;
  handle?: string;
  image?: string;
  imageUrl?: string;
  tokenAddress?: string;
  contractAddress?: string;
};

async function tryBankrSearch(url: string, key: string): Promise<BankrSearchItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as
      | BankrSearchItem[]
      | { data?: BankrSearchItem[]; users?: BankrSearchItem[]; results?: BankrSearchItem[] };
    return Array.isArray(data) ? data : (data.data ?? data.users ?? data.results ?? []);
  } catch {
    return [];
  }
}

export async function searchBankrAgents(query: string): Promise<AgentResult[]> {
  const key = process.env.BANKR_API_KEY;
  if (!key) return [];

  const q = encodeURIComponent(query.replace(/^@/, ""));
  const results: AgentResult[] = [];

  const [searchItems, resolveItems, launchItems] = await Promise.all([
    tryBankrSearch(`https://api.bankr.bot/users/search?q=${q}`, key),
    tryBankrSearch(`https://api.bankr.bot/addresses/resolve?handle=${q}`, key),
    tryBankrSearch(`https://api.bankr.bot/token-launches`, key),
  ]);

  // Filter token-launches by name/symbol
  const ql = query.toLowerCase().replace(/^@/, "");
  const filteredLaunches = launchItems.filter((item) => {
    const sym = (item.symbol ?? item.ticker ?? "").toLowerCase();
    const name = (item.name ?? item.username ?? item.handle ?? "").toLowerCase();
    return sym.includes(ql) || name.includes(ql);
  });

  for (const item of [...searchItems, ...resolveItems, ...filteredLaunches]) {
    const symbol = (item.symbol ?? item.ticker ?? "").toUpperCase();
    const name = item.name ?? item.username ?? item.handle ?? symbol;
    const tokenAddress = (
      item.tokenAddress ?? item.contractAddress ?? item.address ?? ""
    ).toLowerCase();
    const walletAddress = (
      item.walletAddress ?? item.wallet ?? ""
    ).toLowerCase();

    if (!tokenAddress.startsWith("0x") && !walletAddress.startsWith("0x")) continue;
    if (results.some((r) => r.tokenAddress === tokenAddress)) continue;

    results.push({
      name,
      symbol,
      ecosystem: "BANKR",
      tokenAddress: tokenAddress.startsWith("0x") ? tokenAddress : "",
      walletAddress: walletAddress.startsWith("0x") ? walletAddress : undefined,
      imageUrl: item.image ?? item.imageUrl,
    });
  }

  return results.slice(0, 8);
}

// ── Combined search ───────────────────────────────────────────────────────────

export async function searchAgents(query: string): Promise<AgentResult[]> {
  const [virtuals, bankr] = await Promise.allSettled([
    searchVirtualsAgents(query),
    searchBankrAgents(query),
  ]);

  return [
    ...(virtuals.status === "fulfilled" ? virtuals.value : []),
    ...(bankr.status === "fulfilled" ? bankr.value : []),
  ].slice(0, 10);
}
