// Address Classifier — determines whether a registry wallet address is an
// EOA (operator wallet), token contract, proxy, treasury multi-sig, or other
// smart contract.
//
// Rules:
//   - Token contracts must never be treated as operator wallets.
//   - Token contracts must never be used for books.
//   - Only EOAs and treasury_contract (multi-sig) addresses are valid wallet types.
//
// SQL migration (run in Supabase before using address_type field):
//
//   alter table registry_agent_wallets
//     add column if not exists address_type text
//     check (address_type in (
//       'eoa','token_contract','proxy_contract',
//       'treasury_contract','vault','smart_contract','unknown'
//     ))
//     default 'unknown';

export type AddressType =
  | "eoa"               // externally owned account — valid operator wallet
  | "token_contract"    // ERC-20/ERC-721 — NEVER an operator wallet
  | "proxy_contract"    // upgradeable proxy — inspect manually
  | "treasury_contract" // Gnosis Safe or similar multi-sig — valid treasury wallet
  | "vault"             // yield vault / liquidity position
  | "smart_contract"    // generic contract — not a valid operator wallet
  | "unknown";          // classification failed or not yet run

// ── Selectors ─────────────────────────────────────────────────────────────────

const SEL = {
  totalSupply:    "0x18160ddd", // ERC-20
  decimals:       "0x313ce567", // ERC-20
  implementation: "0x5c60da1b", // EIP-1967 transparent proxy
  getOwners:      "0xa0e67e2b", // Gnosis Safe
};

const BASE_URL = "https://base-mainnet.g.alchemy.com/v2";

// ── Internal RPC helper ───────────────────────────────────────────────────────

async function rpc(
  apiKey: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  const json = await res.json() as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

async function ethCall(apiKey: string, to: string, data: string): Promise<string | null> {
  try {
    const result = await rpc(apiKey, "eth_call", [{ to, data }, "latest"]);
    const s = result as string;
    // A revert returns "0x", a success returns >= 32 bytes (66 hex chars)
    return s && s !== "0x" && s !== "0x0" ? s : null;
  } catch {
    return null;
  }
}

// ── Main classifier ───────────────────────────────────────────────────────────

export async function classifyAddress(
  address: string,
  apiKey: string,
  knownTokenAddresses?: Set<string>,
): Promise<AddressType> {
  const addr = address.toLowerCase();

  // Fast path: caller already knows this is a token contract
  if (knownTokenAddresses?.has(addr)) return "token_contract";

  try {
    // Step 1: EOA check
    const code = await rpc(apiKey, "eth_getCode", [addr, "latest"]) as string;
    if (!code || code === "0x" || code === "0x0") return "eoa";

    // Step 2: ERC-20 — totalSupply() AND decimals() both return data
    const [supplyData, decimalsData] = await Promise.all([
      ethCall(apiKey, addr, SEL.totalSupply),
      ethCall(apiKey, addr, SEL.decimals),
    ]);
    if (supplyData && decimalsData) return "token_contract";

    // Step 3: Proxy — implementation() returns a 32-byte address
    const implData = await ethCall(apiKey, addr, SEL.implementation);
    // 32 bytes = 64 hex chars + "0x" = 66 chars
    if (implData && implData.length === 66) return "proxy_contract";

    // Step 4: Gnosis Safe — getOwners() returns ABI-encoded owner array
    const ownersData = await ethCall(apiKey, addr, SEL.getOwners);
    // Minimum response: 32-byte offset + 32-byte length + 1 address = 128 hex chars (130 with 0x)
    if (ownersData && ownersData.length >= 130) return "treasury_contract";

    return "smart_contract";
  } catch {
    return "unknown";
  }
}

// ── Batch classification ──────────────────────────────────────────────────────

type BatchResult = { address: string; address_type: AddressType; error?: string };

export async function classifyAddressBatch(
  addresses: string[],
  apiKey: string,
  knownTokenAddresses?: Set<string>,
  concurrency = 5,
): Promise<BatchResult[]> {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const results: BatchResult[] = [];

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((addr) => classifyAddress(addr, apiKey, knownTokenAddresses)),
    );
    for (let j = 0; j < batch.length; j++) {
      const s = settled[j];
      results.push(
        s.status === "fulfilled"
          ? { address: batch[j], address_type: s.value }
          : { address: batch[j], address_type: "unknown", error: String(s.reason) },
      );
    }
    // Small pause between batches to avoid rate limits
    if (i + concurrency < unique.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

// ── Valid wallet types (safe for books) ───────────────────────────────────────

const VALID_FOR_BOOKS = new Set<AddressType>(["eoa", "treasury_contract", "unknown"]);

export function isValidWalletType(t: AddressType): boolean {
  return VALID_FOR_BOOKS.has(t);
}
