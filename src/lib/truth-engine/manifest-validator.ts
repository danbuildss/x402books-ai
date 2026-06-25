const ROLE_SET = new Set(["treasury", "revenue", "fee", "operator", "deployer", "candidate"]);
const CHAIN_SET = new Set(["base", "ethereum", "arbitrum", "optimism", "polygon", "solana", "other"]);
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface ManifestWallet {
  address: string;
  role: string;
  chain: string;
  label?: string;
  notes?: string;
}

export interface ParsedManifest {
  agent: string;
  wallets: ManifestWallet[];
  version?: string;
  ecosystem?: string;
  project?: string;
  website?: string;
  x?: string;
  xHandle?: string;
  did?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateManifest(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { ok: false, errors: ["manifest must be a JSON object"] };
  }

  const d = data as Record<string, unknown>;

  if (typeof d.agent !== "string" || !d.agent.trim()) {
    errors.push("agent must be a non-empty string");
  }

  const wallets = d.wallets;
  if (!Array.isArray(wallets) || wallets.length === 0) {
    errors.push("wallets must be a non-empty array");
    return { ok: errors.length === 0, errors };
  }

  const seen = new Set<string>();
  for (let idx = 0; idx < wallets.length; idx++) {
    const wallet = wallets[idx];
    if (typeof wallet !== "object" || wallet === null) {
      errors.push(`wallets[${idx}] must be an object`);
      continue;
    }

    const w = wallet as Record<string, unknown>;
    const address = w.address as string | undefined;
    const role = w.role as string | undefined;
    const chain = w.chain as string | undefined;

    if (typeof address !== "string" || !ADDRESS_RE.test(address)) {
      errors.push(`wallets[${idx}].address must be a valid 0x address`);
    }
    if (!role || !ROLE_SET.has(role)) {
      errors.push(`wallets[${idx}].role must be one of ${[...ROLE_SET].sort().join(", ")}`);
    }
    if (!chain || !CHAIN_SET.has(chain)) {
      errors.push(`wallets[${idx}].chain must be one of ${[...CHAIN_SET].sort().join(", ")}`);
    }

    if (typeof address === "string" && role && ROLE_SET.has(role) && chain && CHAIN_SET.has(chain)) {
      const key = `${address.toLowerCase()}:${role}:${chain}`;
      if (seen.has(key)) {
        errors.push(`wallets[${idx}] duplicates an existing address/role/chain tuple`);
      }
      seen.add(key);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function parseManifest(data: unknown): ParsedManifest {
  const d = data as Record<string, unknown>;
  const rawWallets = Array.isArray(d.wallets) ? (d.wallets as Record<string, unknown>[]) : [];

  return {
    agent:     String(d.agent ?? "").trim(),
    version:   typeof d.version === "string" ? d.version : undefined,
    ecosystem: typeof d.ecosystem === "string" ? d.ecosystem : undefined,
    project:   typeof d.project === "string" ? d.project : undefined,
    website:   typeof d.website === "string" ? d.website : undefined,
    x:         typeof d.x === "string" ? d.x : undefined,
    xHandle:   typeof d.xHandle === "string" ? d.xHandle : undefined,
    did:       typeof d.did === "string" ? d.did : undefined,
    wallets:   rawWallets.map((w) => ({
      address: String(w.address ?? ""),
      role:    String(w.role ?? ""),
      chain:   String(w.chain ?? ""),
      label:   typeof w.label === "string" ? w.label : undefined,
      notes:   typeof w.notes === "string" ? w.notes : undefined,
    })),
  };
}
