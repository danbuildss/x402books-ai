// ERC-8004 wallets.json manifest parser and validator.
//
// ERC-8004 defines the financial identity standard for autonomous agents.
// A wallets.json manifest declares which wallets belong to an agent and in
// what capacity — it is identity, NOT financial attribution. Verification
// (evidenceSource = "verified") requires separate on-chain confirmation.
//
// This module is the canonical TypeScript parser. The API layer at
// /api/validate-manifest uses this same logic.

export const VALID_CHAINS = [
  "base", "ethereum", "arbitrum", "optimism", "polygon",
  "solana", "avalanche", "bnb", "zora", "blast",
  "linea", "scroll", "mode", "other",
] as const;

export const VALID_ROLES = [
  "treasury", "revenue", "expense", "operator", "deployer",
  "fee_recipient", "payment_receiver", "token_contract",
  "token_bound_account", "unknown",
] as const;

export const VALID_VERIFICATION_METHODS = [
  "repo_manifest", "on_chain_signature", "dns_record",
  "social_post", "multisig_ownership",
] as const;

export type ManifestChain = typeof VALID_CHAINS[number];
export type ManifestRole  = typeof VALID_ROLES[number];
export type ManifestVerificationMethod = typeof VALID_VERIFICATION_METHODS[number];

export type ManifestWallet = {
  address:             string;
  chain:               ManifestChain;
  role:                ManifestRole;
  label?:              string;
  active?:             boolean;
  last_updated?:       string;
  verification_method?: ManifestVerificationMethod;
  notes?:              string;
};

export type WalletsManifest = {
  version?:   string;
  agent:      string;
  project?:   string;
  ecosystem?: string;
  website?:   string;
  x?:         string;
  did?:       string;
  wallets:    ManifestWallet[];
};

export type ParseError = {
  path:    string;
  message: string;
};

export type ParseResult =
  | { ok: true;  manifest: WalletsManifest; errors: [] }
  | { ok: false; manifest: null;            errors: ParseError[] };

// ── Validation helpers ────────────────────────────────────────────────────────

const EVM_ADDRESS_RE  = /^0x[a-fA-F0-9]{40}$/;
const ISO_DATE_RE     = /^\d{4}-\d{2}-\d{2}$/;
const X_HANDLE_RE     = /^@?[A-Za-z0-9_]{1,50}$/;
const DID_RE          = /^did:[a-z][a-z0-9]*:.+$/;

const CHAIN_SET = new Set<string>(VALID_CHAINS);
const ROLE_SET  = new Set<string>(VALID_ROLES);
const VM_SET    = new Set<string>(VALID_VERIFICATION_METHODS);

function validateWallet(w: unknown, idx: number): ParseError[] {
  const errors: ParseError[] = [];
  const prefix = `wallets[${idx}]`;

  if (typeof w !== "object" || w === null || Array.isArray(w)) {
    return [{ path: prefix, message: "Each wallet entry must be a JSON object" }];
  }

  const obj = w as Record<string, unknown>;

  for (const f of ["address", "chain", "role"] as const) {
    if (!(f in obj)) {
      errors.push({ path: `${prefix}.${f}`, message: `Required field "${f}" is missing` });
    }
  }

  if ("address" in obj) {
    if (typeof obj.address !== "string" || !EVM_ADDRESS_RE.test(obj.address)) {
      errors.push({ path: `${prefix}.address`, message: "Must be a valid EVM address (0x + 40 hex chars)" });
    }
  }

  if ("chain" in obj && !CHAIN_SET.has(obj.chain as string)) {
    errors.push({ path: `${prefix}.chain`, message: `"chain" must be one of: ${VALID_CHAINS.join(", ")}` });
  }

  if ("role" in obj && !ROLE_SET.has(obj.role as string)) {
    errors.push({ path: `${prefix}.role`, message: `"role" must be one of: ${VALID_ROLES.join(", ")}` });
  }

  if ("verification_method" in obj && obj.verification_method !== undefined) {
    if (!VM_SET.has(obj.verification_method as string)) {
      errors.push({ path: `${prefix}.verification_method`, message: `"verification_method" must be one of: ${VALID_VERIFICATION_METHODS.join(", ")}` });
    }
  }

  if ("last_updated" in obj && obj.last_updated !== undefined) {
    if (typeof obj.last_updated !== "string" || !ISO_DATE_RE.test(obj.last_updated)) {
      errors.push({ path: `${prefix}.last_updated`, message: '"last_updated" must be an ISO date (YYYY-MM-DD)' });
    }
  }

  if ("active" in obj && obj.active !== undefined && typeof obj.active !== "boolean") {
    errors.push({ path: `${prefix}.active`, message: '"active" must be a boolean' });
  }

  if ("label" in obj && obj.label !== undefined && (typeof obj.label !== "string" || (obj.label as string).length === 0)) {
    errors.push({ path: `${prefix}.label`, message: '"label" must be a non-empty string' });
  }

  if ("notes" in obj && obj.notes !== undefined && typeof obj.notes !== "string") {
    errors.push({ path: `${prefix}.notes`, message: '"notes" must be a string' });
  }

  return errors;
}

// ── parseManifest ─────────────────────────────────────────────────────────────

export function parseManifest(raw: unknown): ParseResult {
  const errors: ParseError[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, manifest: null, errors: [{ path: "(root)", message: "Manifest must be a JSON object" }] };
  }

  const obj = raw as Record<string, unknown>;

  // Required root fields
  for (const field of ["agent", "wallets"]) {
    if (!(field in obj)) {
      errors.push({ path: field, message: `Required field "${field}" is missing` });
    }
  }

  if ("agent" in obj && (typeof obj.agent !== "string" || (obj.agent as string).trim().length === 0)) {
    errors.push({ path: "agent", message: '"agent" must be a non-empty string' });
  }

  if ("project" in obj && obj.project !== undefined && (typeof obj.project !== "string" || (obj.project as string).length === 0)) {
    errors.push({ path: "project", message: '"project" must be a non-empty string' });
  }

  if ("ecosystem" in obj && obj.ecosystem !== undefined && typeof obj.ecosystem !== "string") {
    errors.push({ path: "ecosystem", message: '"ecosystem" must be a string' });
  }

  if ("version" in obj && obj.version !== undefined && typeof obj.version !== "string") {
    errors.push({ path: "version", message: '"version" must be a string (e.g. "1.0")' });
  }

  if ("website" in obj && obj.website !== undefined) {
    try { new URL(obj.website as string); } catch {
      errors.push({ path: "website", message: '"website" must be a valid URL' });
    }
  }

  if ("x" in obj && obj.x !== undefined) {
    if (typeof obj.x !== "string" || !X_HANDLE_RE.test(obj.x)) {
      errors.push({ path: "x", message: '"x" must be a valid X/Twitter handle (e.g. "@agentname")' });
    }
  }

  if ("did" in obj && obj.did !== undefined) {
    if (typeof obj.did !== "string" || !DID_RE.test(obj.did)) {
      errors.push({ path: "did", message: '"did" must follow the pattern did:<method>:<id>' });
    }
  }

  if ("wallets" in obj) {
    if (!Array.isArray(obj.wallets)) {
      errors.push({ path: "wallets", message: '"wallets" must be an array' });
    } else if ((obj.wallets as unknown[]).length === 0) {
      errors.push({ path: "wallets", message: '"wallets" must contain at least one entry' });
    } else {
      (obj.wallets as unknown[]).forEach((w, i) => {
        errors.push(...validateWallet(w, i));
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, manifest: null, errors };
  }

  return {
    ok: true,
    errors: [],
    manifest: {
      version:   typeof obj.version   === "string" ? obj.version   : undefined,
      agent:     obj.agent as string,
      project:   typeof obj.project   === "string" ? obj.project   : undefined,
      ecosystem: typeof obj.ecosystem === "string" ? obj.ecosystem : undefined,
      website:   typeof obj.website   === "string" ? obj.website   : undefined,
      x:         typeof obj.x         === "string" ? obj.x         : undefined,
      did:       typeof obj.did       === "string" ? obj.did       : undefined,
      wallets:   (obj.wallets as unknown[]).map((w) => {
        const wallet = w as Record<string, unknown>;
        return {
          address:             wallet.address as string,
          chain:               wallet.chain as ManifestChain,
          role:                wallet.role as ManifestRole,
          label:               typeof wallet.label === "string" ? wallet.label : undefined,
          active:              typeof wallet.active === "boolean" ? wallet.active : undefined,
          last_updated:        typeof wallet.last_updated === "string" ? wallet.last_updated : undefined,
          verification_method: typeof wallet.verification_method === "string"
            ? wallet.verification_method as ManifestVerificationMethod
            : undefined,
          notes:               typeof wallet.notes === "string" ? wallet.notes : undefined,
        };
      }),
    },
  };
}

// ── parseManifestFromJson ─────────────────────────────────────────────────────

export function parseManifestFromJson(jsonText: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      manifest: null,
      errors: [{ path: "(root)", message: "Invalid JSON — could not parse manifest file" }],
    };
  }
  return parseManifest(parsed);
}

// ── Summary helpers ───────────────────────────────────────────────────────────

export function manifestSummary(manifest: WalletsManifest) {
  const activeWallets = manifest.wallets.filter((w) => w.active !== false);
  const roles = [...new Set(manifest.wallets.map((w) => w.role))];
  const chains = [...new Set(manifest.wallets.map((w) => w.chain))];

  return {
    agent:          manifest.agent,
    project:        manifest.project ?? null,
    ecosystem:      manifest.ecosystem ?? null,
    total_wallets:  manifest.wallets.length,
    active_wallets: activeWallets.length,
    roles,
    chains,
    has_treasury:   roles.some((r) => r === "treasury" || r === "fee_recipient"),
    has_token:      roles.includes("token_contract"),
  };
}
