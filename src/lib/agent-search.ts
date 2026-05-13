// Server-side agent search across BANKR and Virtuals Protocol ecosystems.

export type AgentResult = {
  name: string;
  symbol: string;
  ecosystem: "BANKR" | "VIRTUALS";
  tokenAddress: string;
  walletAddress?: string;
  imageUrl?: string;
  mcap?: number;
  xHandle?: string;
};

// ── BANKR ─────────────────────────────────────────────────────────────────────
// Endpoint: GET /token-launches
// Auth: X-API-Key header
// Shape: array of { tokenAddress, tokenSymbol, deployer: { xHandle } }

type BankrLaunch = {
  tokenAddress?: string;
  tokenSymbol?: string;
  name?: string;
  deployer?: {
    xHandle?: string;
    walletAddress?: string;
  };
  imageUrl?: string;
  image?: string;
};

export async function searchBankrAgents(query: string): Promise<AgentResult[]> {
  const key = process.env.BANKR_API_KEY;
  if (!key) return [];

  const q = query.trim().toLowerCase().replace(/^@/, "");

  try {
    const res = await fetch(`${process.env.BANKR_API_URL ?? "https://api.bankr.bot"}/token-launches`, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 300 }, // 5min cache
    });
    if (!res.ok) return [];

    const data = await res.json() as BankrLaunch[];
    if (!Array.isArray(data)) return [];

    const results: AgentResult[] = [];

    for (const item of data) {
      const symbol = (item.tokenSymbol ?? "").toLowerCase();
      const name = (item.name ?? item.tokenSymbol ?? "").toLowerCase();
      const xHandle = (item.deployer?.xHandle ?? "").toLowerCase().replace(/^@/, "");
      const tokenAddress = (item.tokenAddress ?? "").toLowerCase();

      if (!tokenAddress.startsWith("0x")) continue;

      // Match by symbol, name, or X handle
      if (!symbol.includes(q) && !name.includes(q) && !xHandle.includes(q)) continue;

      results.push({
        name: item.name ?? item.tokenSymbol ?? "",
        symbol: (item.tokenSymbol ?? "").replace(/^\$/, "").toUpperCase(),
        ecosystem: "BANKR",
        tokenAddress,
        walletAddress: item.deployer?.walletAddress?.toLowerCase(),
        imageUrl: item.imageUrl ?? item.image,
        xHandle: item.deployer?.xHandle,
      });
    }

    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// ── Virtuals ──────────────────────────────────────────────────────────────────
// Endpoint: GET /api/virtuals?sort[0]=mcapInVirtual:desc
// Auth: none (public)
// Shape: { data: [{ id, attributes: { name, symbol, tokenAddress, mcapInVirtual, twitter } }] }

type VirtualsItem = {
  id?: number;
  attributes?: {
    name?: string;
    symbol?: string;
    tokenAddress?: string;
    mcapInVirtual?: number;
    twitter?: string;
    image?: { data?: { attributes?: { url?: string } } };
    // Some responses have image directly on attributes
    imageUrl?: string;
  };
};

export async function searchVirtualsAgents(query: string): Promise<AgentResult[]> {
  const q = query.trim().toLowerCase().replace(/^@/, "");

  try {
    const base = process.env.VIRTUALS_API_URL ?? "https://api.virtuals.io/api";
    // Server-side filter across name, symbol, and twitter handle
    const qEnc = encodeURIComponent(q);
    const url =
      `${base}/virtuals` +
      `?filters[$or][0][name][$containsi]=${qEnc}` +
      `&filters[$or][1][symbol][$containsi]=${qEnc}` +
      `&filters[$or][2][twitter][$containsi]=${qEnc}` +
      `&sort[0]=mcapInVirtual:desc&pagination[pageSize]=50&populate=*`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const body = await res.json() as { data?: VirtualsItem[] };
    const results: AgentResult[] = [];

    for (const item of body.data ?? []) {
      const attr = item.attributes ?? {};
      const tokenAddress = (attr.tokenAddress ?? "").toLowerCase();
      if (!tokenAddress.startsWith("0x")) continue;

      const rawImageUrl = attr.imageUrl ?? attr.image?.data?.attributes?.url;

      results.push({
        name: attr.name ?? "",
        symbol: (attr.symbol ?? "").toUpperCase(),
        ecosystem: "VIRTUALS",
        tokenAddress,
        mcap: attr.mcapInVirtual,
        imageUrl: rawImageUrl?.startsWith("http") ? rawImageUrl : undefined,
        xHandle: attr.twitter,
      });
    }

    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// ── Combined ──────────────────────────────────────────────────────────────────

export async function searchAgents(query: string): Promise<AgentResult[]> {
  const [bankr, virtuals] = await Promise.allSettled([
    searchBankrAgents(query),
    searchVirtualsAgents(query),
  ]);

  return [
    ...(bankr.status === "fulfilled" ? bankr.value : []),
    ...(virtuals.status === "fulfilled" ? virtuals.value : []),
  ].slice(0, 10);
}
