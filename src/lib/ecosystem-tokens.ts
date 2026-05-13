// Server-side module — fetches BANKR + Virtuals ecosystem token registries.
// Results are cached in memory for 10 minutes (best-effort across warm instances).

import { STABLECOIN_ADDRESSES } from "@/lib/tokens";

const BASE_NATIVE = new Set(["USDC", "USDT", "DAI", "EURC", "WETH", "cbBTC", "ETH"]);

// Fallback hardcoded addresses/symbols if APIs are down
const FALLBACK_BANKR_ADDRESSES = new Set([
  "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b", // BNKR
  "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07", // CLAWD
]);

const FALLBACK_VIRTUALS_SYMBOLS = new Set([
  "VIRTUAL", "LUNA", "AIXBT", "GAME", "VADER", "CLANKER",
  "SEKOIA", "ACOLYT", "SPORE", "MISATO", "LMAO", "NOOK",
  "CRED", "XBOOKS", "DEGEN", "MOCA",
]);

export type EcosystemRegistry = {
  addresses: Set<string>;  // lowercase contract addresses
  symbols: Set<string>;    // uppercase token symbols
};

let cache: (EcosystemRegistry & { ts: number }) | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ── BANKR ─────────────────────────────────────────────────────────────────────

// Confirmed shape: array of { tokenAddress, tokenSymbol, deployer: { xHandle } }
type BankrToken = {
  tokenAddress?: string;
  tokenSymbol?: string;
};

async function fetchBankrTokens(): Promise<EcosystemRegistry> {
  const addresses = new Set<string>(
    [...FALLBACK_BANKR_ADDRESSES].map((a) => a.toLowerCase()),
  );
  const symbols = new Set<string>(["BNKR", "BANKR"]);

  const key = process.env.BANKR_API_KEY;
  if (!key) return { addresses, symbols };

  try {
    const base = process.env.BANKR_API_URL ?? "https://api.bankr.bot";
    const res = await fetch(`${base}/token-launches`, {
      headers: { "X-API-Key": key, "Accept": "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { addresses, symbols };

    const data = await res.json() as BankrToken[];
    if (!Array.isArray(data)) return { addresses, symbols };

    for (const t of data) {
      const addr = (t.tokenAddress ?? "").toLowerCase();
      const sym = (t.tokenSymbol ?? "").replace(/^\$/, "").toUpperCase();
      if (addr.startsWith("0x")) addresses.add(addr);
      if (sym) symbols.add(sym);
    }
  } catch {
    // fall back to hardcoded list
  }

  return { addresses, symbols };
}

// ── Virtuals Protocol ─────────────────────────────────────────────────────────

// Confirmed shape: { data: [{ id, attributes: { name, symbol, tokenAddress, mcapInVirtual, twitter } }] }
type VirtualsItem = {
  id?: number;
  attributes?: {
    name?: string;
    symbol?: string;
    tokenAddress?: string;
    mcapInVirtual?: number;
    twitter?: string;
  };
};

type VirtualsResponse = {
  data?: VirtualsItem[];
  meta?: { pagination?: { pageCount?: number } };
};

async function fetchVirtualsTokens(): Promise<EcosystemRegistry> {
  const addresses = new Set<string>();
  const symbols = new Set<string>([...FALLBACK_VIRTUALS_SYMBOLS]);

  try {
    const base = process.env.VIRTUALS_API_URL ?? "https://api.virtuals.io/api";
    const pageSize = 50;

    // Fetch page 1 first to learn the total page count
    const firstUrl = `${base}/virtuals?sort[0]=mcapInVirtual:desc&pagination[page]=1&pagination[pageSize]=${pageSize}`;
    const firstRes = await fetch(firstUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!firstRes.ok) return { addresses, symbols };

    const firstBody = await firstRes.json() as VirtualsResponse;
    const totalPages = firstBody.meta?.pagination?.pageCount ?? 1;

    // Collect all items from page 1
    const allItems: VirtualsItem[] = [...(firstBody.data ?? [])];

    // Fetch all remaining pages in parallel (no more sequential loop)
    if (totalPages > 1) {
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const pages = await Promise.all(
        remaining.map((page) =>
          fetch(
            `${base}/virtuals?sort[0]=mcapInVirtual:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`,
            { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8_000) },
          )
            .then((r) => r.ok ? r.json() as Promise<VirtualsResponse> : Promise.resolve({ data: [] }))
            .catch(() => ({ data: [] } as VirtualsResponse)),
        ),
      );
      for (const body of pages) allItems.push(...(body.data ?? []));
    }

    for (const item of allItems) {
      const attr = item.attributes ?? {};
      const addr = (attr.tokenAddress ?? "").toLowerCase();
      const sym = (attr.symbol ?? "").toUpperCase();
      if (addr.startsWith("0x")) addresses.add(addr);
      if (sym) symbols.add(sym);
    }
  } catch {
    // fall back to hardcoded list
  }

  return { addresses, symbols };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getEcosystemRegistry(): Promise<EcosystemRegistry> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return { addresses: cache.addresses, symbols: cache.symbols };
  }

  const [bankr, virtuals] = await Promise.allSettled([
    fetchBankrTokens(),
    fetchVirtualsTokens(),
  ]);

  const addresses = new Set<string>([
    ...STABLECOIN_ADDRESSES,
  ]);
  const symbols = new Set<string>([...BASE_NATIVE]);

  for (const result of [bankr, virtuals]) {
    if (result.status === "fulfilled") {
      for (const a of result.value.addresses) addresses.add(a.toLowerCase());
      for (const s of result.value.symbols) symbols.add(s.toUpperCase());
    }
  }

  cache = { addresses, symbols, ts: Date.now() };
  return { addresses, symbols };
}

export function isInEcosystem(
  tokenAddress: string,
  tokenSymbol: string,
  registry: EcosystemRegistry,
): boolean {
  return (
    registry.addresses.has(tokenAddress.toLowerCase()) ||
    registry.symbols.has(tokenSymbol.toUpperCase())
  );
}
