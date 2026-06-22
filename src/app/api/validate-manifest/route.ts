// POST /api/validate-manifest
// Stateless manifest validation — no DB write, no auth required.
// Used by the /manifest/validate UI and the GitHub Action CI check.
//
// Returns: { ok: boolean, errors?: ValidationError[], summary?: { agent, wallets } }

import { NextRequest, NextResponse } from "next/server";

const VALID_CHAINS = [
  "base", "ethereum", "arbitrum", "optimism", "polygon",
  "solana", "avalanche", "bnb", "zora", "blast",
  "linea", "scroll", "mode", "other",
];

const VALID_ROLES = [
  "treasury", "revenue", "expense", "operator", "deployer",
  "fee_recipient", "payment_receiver", "token_contract",
  "token_bound_account", "unknown",
];

const VALID_VERIFICATION_METHODS = [
  "repo_manifest", "on_chain_signature", "dns_record",
  "social_post", "multisig_ownership",
];

type ValidationError = { path: string; message: string };

function validateManifest(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [{ path: "(root)", message: "Manifest must be a JSON object" }];
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
    if (typeof obj.x !== "string" || !/^@?[A-Za-z0-9_]{1,50}$/.test(obj.x as string)) {
      errors.push({ path: "x", message: '"x" must be a valid X/Twitter handle' });
    }
  }
  if ("did" in obj && obj.did !== undefined) {
    if (typeof obj.did !== "string" || !/^did:[a-z]+:.+$/.test(obj.did as string)) {
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
        const prefix = `wallets[${i}]`;
        if (typeof w !== "object" || w === null || Array.isArray(w)) {
          errors.push({ path: prefix, message: "Each wallet must be an object" });
          return;
        }
        const wallet = w as Record<string, unknown>;

        for (const f of ["address", "chain", "role"]) {
          if (!(f in wallet)) {
            errors.push({ path: `${prefix}.${f}`, message: `Required field "${f}" is missing` });
          }
        }
        if ("address" in wallet) {
          if (typeof wallet.address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(wallet.address as string)) {
            errors.push({ path: `${prefix}.address`, message: "Must be a valid EVM address (0x + 40 hex chars)" });
          }
        }
        if ("chain" in wallet && !VALID_CHAINS.includes(wallet.chain as string)) {
          errors.push({ path: `${prefix}.chain`, message: `"chain" must be one of: ${VALID_CHAINS.join(", ")}` });
        }
        if ("role" in wallet && !VALID_ROLES.includes(wallet.role as string)) {
          errors.push({ path: `${prefix}.role`, message: `"role" must be one of: ${VALID_ROLES.join(", ")}` });
        }
        if ("verification_method" in wallet && wallet.verification_method !== undefined &&
            !VALID_VERIFICATION_METHODS.includes(wallet.verification_method as string)) {
          errors.push({ path: `${prefix}.verification_method`, message: `"verification_method" must be one of: ${VALID_VERIFICATION_METHODS.join(", ")}` });
        }
        if ("last_updated" in wallet && wallet.last_updated !== undefined) {
          if (typeof wallet.last_updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(wallet.last_updated as string)) {
            errors.push({ path: `${prefix}.last_updated`, message: '"last_updated" must be an ISO date (YYYY-MM-DD)' });
          }
        }
        if ("active" in wallet && wallet.active !== undefined && typeof wallet.active !== "boolean") {
          errors.push({ path: `${prefix}.active`, message: '"active" must be a boolean' });
        }
      });
    }
  }

  return errors;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 51200) {
      return NextResponse.json({ ok: false, errors: [{ path: "(root)", message: "Manifest too large (max 50KB)" }] }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, errors: [{ path: "(root)", message: "Invalid JSON" }] }, { status: 400 });
  }

  const errors = validateManifest(body);

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const manifest = body as Record<string, unknown>;
  const wallets  = manifest.wallets as Array<Record<string, unknown>>;

  return NextResponse.json({
    ok: true,
    summary: {
      version:   manifest.version ?? null,
      agent:     manifest.agent,
      project:   manifest.project ?? null,
      ecosystem: manifest.ecosystem ?? null,
      wallets:   wallets.length,
      roles:     wallets.map((w) => w.role),
    },
  });
}
