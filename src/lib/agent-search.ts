// Server-side agent search across BANKR and Virtuals Protocol ecosystems.

// Strips spaces and special chars so "JunoAgent" matches "Juno Agent"
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type WalletType = "sentient" | "tba" | "deployer" | "token";

export type AgentResult = {
  name: string;
  symbol: string;
  ecosystem: "BANKR" | "VIRTUALS";
  tokenAddress: string;
  walletAddress: string;   // always populated — never undefined
  walletType: WalletType;
  imageUrl?: string;
  mcap?: number;
  xHandle?: string;
};

// ── BANKR ─────────────────────────────────────────────────────────────────────
// Shape: array of { tokenAddress, tokenSymbol, deployer: { address, xHandle } }

type BankrLaunch = {
  tokenAddress?: string;
  tokenSymbol?: string;
  name?: string;
  deployer?: {
    address?: string;      // EOA that launched — the operational wallet
    xHandle?: string;
    walletAddress?: string;
  };
  imageUrl?: string;
  image?: string;
};

export async function searchBankrAgents(query: string): Promise<AgentResult[]> {
  const key = process.env.BANKR_API_KEY;
  if (!key) return [];

  const q = normalize(query.replace(/^@/, ""));

  try {
    const res = await fetch(`${process.env.BANKR_API_URL ?? "https://api.bankr.bot"}/token-launches`, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const data = await res.json() as BankrLaunch[];
    if (!Array.isArray(data)) return [];

    const results: AgentResult[] = [];

    for (const item of data) {
      const symbol = normalize(item.tokenSymbol ?? "");
      const name = normalize(item.name ?? item.tokenSymbol ?? "");
      const xHandle = normalize(item.deployer?.xHandle ?? "");
      const tokenAddress = (item.tokenAddress ?? "").toLowerCase();

      if (!tokenAddress.startsWith("0x")) continue;
      if (!symbol.includes(q) && !name.includes(q) && !xHandle.includes(q)) continue;

      // deployer.address is the operational EOA for BANKR agents
      const deployerAddr = (
        item.deployer?.address ??
        item.deployer?.walletAddress ??
        ""
      ).toLowerCase();

      const walletAddress = deployerAddr.startsWith("0x") ? deployerAddr : tokenAddress;
      const walletType: WalletType = deployerAddr.startsWith("0x") ? "deployer" : "token";

      results.push({
        name: item.name ?? item.tokenSymbol ?? "",
        symbol: (item.tokenSymbol ?? "").replace(/^\$/, "").toUpperCase(),
        ecosystem: "BANKR",
        tokenAddress,
        walletAddress,
        walletType,
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
// Shape: { data: [{ id, attributes: { name, symbol, tokenAddress,
//   sentientWalletAddress, tbaAddress, mcapInVirtual, twitter } }] }

type VirtualsItem = {
  id?: number;
  attributes?: {
    name?: string;
    symbol?: string;
    tokenAddress?: string;
    sentientWalletAddress?: string;  // primary: autonomous agent brain wallet
    tbaAddress?: string;             // fallback: ERC-6551 token-bound account
    mcapInVirtual?: number;
    twitter?: string;
    image?: { data?: { attributes?: { url?: string } } };
    imageUrl?: string;
  };
};

export async function searchVirtualsAgents(query: string): Promise<AgentResult[]> {
  const q = normalize(query.replace(/^@/, ""));
  // Use the raw (un-normalized) query for the server-side Strapi filter
  const qRaw = query.replace(/^@/, "").trim();

  try {
    const base = process.env.VIRTUALS_API_URL ?? "https://api.virtuals.io/api";
    const qEnc = encodeURIComponent(qRaw);
    const url =
      `${base}/virtuals` +
      `?filters[$or][0][name][$containsi]=${qEnc}` +
      `&filters[$or][1][symbol][$containsi]=${qEnc}` +
      `&filters[$or][2][twitter][$containsi]=${qEnc}` +
      `&sort[0]=mcapInVirtual:desc&pagination[pageSize]=100&populate=*`;

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

      // Local normalize check — catches cases server filter missed (e.g. "junoagent" vs "juno agent")
      const nName = normalize(attr.name ?? "");
      const nSym = normalize(attr.symbol ?? "");
      const nTwitter = normalize(attr.twitter ?? "");
      if (!nName.includes(q) && !nSym.includes(q) && !nTwitter.includes(q)) continue;

      // Wallet priority: sentientWalletAddress → tbaAddress → tokenAddress
      const sentient = (attr.sentientWalletAddress ?? "").toLowerCase();
      const tba = (attr.tbaAddress ?? "").toLowerCase();

      let walletAddress: string;
      let walletType: WalletType;

      if (sentient.startsWith("0x")) {
        walletAddress = sentient;
        walletType = "sentient";
      } else if (tba.startsWith("0x")) {
        walletAddress = tba;
        walletType = "tba";
      } else {
        walletAddress = tokenAddress;
        walletType = "token";
      }

      const rawImageUrl = attr.imageUrl ?? attr.image?.data?.attributes?.url;

      results.push({
        name: attr.name ?? "",
        symbol: (attr.symbol ?? "").toUpperCase(),
        ecosystem: "VIRTUALS",
        tokenAddress,
        walletAddress,
        walletType,
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
