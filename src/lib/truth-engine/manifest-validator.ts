const ROLE_SET = new Set([
  "treasury", "revenue", "fee", "fee_recipient", "operator", "deployer", "candidate",
  "settlement", "operations", "execution", "escrow", "fee_collection", "deployment", "refunds", "payroll", "unknown",
]);
const CHAIN_SET = new Set(["base", "ethereum", "arbitrum", "optimism", "polygon", "solana", "other"]);
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type WalletStatus = "active" | "inactive" | "revoked";
export type ClaimSource = "repository_manifest" | "operator_submission" | "registry_import" | "discovered";
export type ControlProof = "eip712" | "eip1271" | "solana_signature" | "onchain_registry" | "operator_attestation" | "none";

export interface ManifestWallet {
  address: string;
  role: string;
  chain: string;
  label?: string;
  notes?: string;
  valid_from?: string;
  valid_until?: string;
  status?: WalletStatus;
  claimed_at?: string;
  verified_at?: string;
  revoked_at?: string;
  revocation_reason?: string;
  claim_source?: ClaimSource;
  control_proof?: ControlProof;
}

export interface ParsedManifest {
  agent: string;
  agent_id?: string;
  wallets: ManifestWallet[];
  version?: string;
  ecosystem?: string;
  project?: string;
  website?: string;
  x?: string;
  xHandle?: string;
  did?: string;
  source_revision?: string;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

function isValidAddress(address: string, chain: string): boolean {
  if (chain === "solana") return SOLANA_ADDRESS_RE.test(address);
  if (chain === "other") return EVM_ADDRESS_RE.test(address) || SOLANA_ADDRESS_RE.test(address);
  return EVM_ADDRESS_RE.test(address);
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateManifest(data: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      errors: ["manifest must be a JSON object"],
      warnings,
      issues: [{ code: "MANIFEST_TYPE", path: "$", message: "manifest must be a JSON object" }],
    };
  }

  const d = data as Record<string, unknown>;
  if (typeof d.agent !== "string" || !d.agent.trim()) add("AGENT_REQUIRED", "agent", "agent must be a non-empty string");
  if (d.agent_id !== undefined && (typeof d.agent_id !== "string" || !d.agent_id.trim())) {
    add("AGENT_ID_INVALID", "agent_id", "agent_id must be a non-empty string when provided");
  }

  const wallets = d.wallets;
  if (!Array.isArray(wallets) || wallets.length === 0) {
    add("WALLETS_REQUIRED", "wallets", "wallets must be a non-empty array");
    return { ok: false, errors: issues.map((i) => i.message), warnings, issues };
  }

  const seen = new Set<string>();
  for (let idx = 0; idx < wallets.length; idx++) {
    const path = `wallets[${idx}]`;
    const wallet = wallets[idx];
    if (typeof wallet !== "object" || wallet === null || Array.isArray(wallet)) {
      add("WALLET_TYPE", path, `${path} must be an object`);
      continue;
    }

    const w = wallet as Record<string, unknown>;
    const address = typeof w.address === "string" ? w.address : "";
    const role = typeof w.role === "string" ? w.role : "";
    const chain = typeof w.chain === "string" ? w.chain.toLowerCase() : "";

    if (!chain || !CHAIN_SET.has(chain)) add("CHAIN_UNSUPPORTED", `${path}.chain`, `${path}.chain must be one of ${[...CHAIN_SET].sort().join(", ")}`);
    if (!address || (CHAIN_SET.has(chain) && !isValidAddress(address, chain))) {
      add("ADDRESS_INVALID_FOR_CHAIN", `${path}.address`, `${path}.address is not valid for chain ${chain || "unknown"}`);
    }
    if (!role || !ROLE_SET.has(role)) add("ROLE_UNSUPPORTED", `${path}.role`, `${path}.role must be one of ${[...ROLE_SET].sort().join(", ")}`);

    const dateFields = ["valid_from", "valid_until", "claimed_at", "verified_at", "revoked_at"] as const;
    for (const field of dateFields) {
      if (w[field] !== undefined && !validDate(w[field])) add("DATE_INVALID", `${path}.${field}`, `${path}.${field} must be an ISO-8601 UTC timestamp`);
    }
    if (validDate(w.valid_from) && validDate(w.valid_until) && Date.parse(w.valid_from) >= Date.parse(w.valid_until)) {
      add("VALIDITY_RANGE_INVALID", path, `${path}.valid_from must be before valid_until`);
    }

    const status = w.status;
    if (status !== undefined && !["active", "inactive", "revoked"].includes(String(status))) add("STATUS_INVALID", `${path}.status`, `${path}.status must be active, inactive, or revoked`);
    if (status === "revoked" && !validDate(w.revoked_at)) add("REVOCATION_DATE_REQUIRED", `${path}.revoked_at`, `${path}.revoked_at is required when status is revoked`);
    if (status !== "revoked" && w.revoked_at !== undefined) add("REVOCATION_STATE_INVALID", `${path}.revoked_at`, `${path}.revoked_at is only valid for a revoked wallet`);

    if (w.claim_source !== undefined && !["repository_manifest", "operator_submission", "registry_import", "discovered"].includes(String(w.claim_source))) {
      add("CLAIM_SOURCE_INVALID", `${path}.claim_source`, `${path}.claim_source is unsupported`);
    }
    if (w.control_proof !== undefined && !["eip712", "eip1271", "solana_signature", "onchain_registry", "operator_attestation", "none"].includes(String(w.control_proof))) {
      add("CONTROL_PROOF_INVALID", `${path}.control_proof`, `${path}.control_proof is unsupported`);
    }

    if (address && chain) {
      const normalized = chain === "solana" ? address : address.toLowerCase();
      const key = `${chain}:${normalized}`;
      if (seen.has(key)) add("WALLET_DUPLICATE", path, `${path} duplicates an existing chain/address wallet`);
      seen.add(key);
    }
  }

  if (!d.agent_id) warnings.push("agent_id is not present; Zetta will resolve the immutable registry agent UUID during ingestion");
  if (wallets.some((w) => typeof w === "object" && w !== null && !("control_proof" in w))) warnings.push("one or more wallets are declared without a control_proof; declaration is not proof of wallet control");

  return { ok: issues.length === 0, errors: issues.map((i) => i.message), warnings, issues };
}

export function parseManifest(data: unknown): ParsedManifest {
  const d = data as Record<string, unknown>;
  const rawWallets = Array.isArray(d.wallets) ? (d.wallets as Record<string, unknown>[]) : [];

  return {
    agent:           String(d.agent ?? "").trim(),
    agent_id:        typeof d.agent_id === "string" ? d.agent_id.trim() : undefined,
    version:         typeof d.version === "string" ? d.version : undefined,
    ecosystem:       typeof d.ecosystem === "string" ? d.ecosystem : undefined,
    project:         typeof d.project === "string" ? d.project : undefined,
    website:         typeof d.website === "string" ? d.website : undefined,
    x:               typeof d.x === "string" ? d.x : undefined,
    xHandle:         typeof d.xHandle === "string" ? d.xHandle : undefined,
    did:             typeof d.did === "string" ? d.did : undefined,
    source_revision: typeof d.source_revision === "string" ? d.source_revision : undefined,
    wallets: rawWallets.map((w) => ({
      address:          String(w.address ?? ""),
      role:             String(w.role ?? ""),
      chain:            String(w.chain ?? "").toLowerCase(),
      label:            typeof w.label === "string" ? w.label : undefined,
      notes:            typeof w.notes === "string" ? w.notes : undefined,
      valid_from:       typeof w.valid_from === "string" ? w.valid_from : undefined,
      valid_until:      typeof w.valid_until === "string" ? w.valid_until : undefined,
      status:           typeof w.status === "string" ? w.status as WalletStatus : undefined,
      claimed_at:       typeof w.claimed_at === "string" ? w.claimed_at : undefined,
      verified_at:      typeof w.verified_at === "string" ? w.verified_at : undefined,
      revoked_at:       typeof w.revoked_at === "string" ? w.revoked_at : undefined,
      revocation_reason: typeof w.revocation_reason === "string" ? w.revocation_reason : undefined,
      claim_source:     typeof w.claim_source === "string" ? w.claim_source as ClaimSource : undefined,
      control_proof:    typeof w.control_proof === "string" ? w.control_proof as ControlProof : undefined,
    })),
  };
}
