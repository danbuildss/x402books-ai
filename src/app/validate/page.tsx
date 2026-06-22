"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import "./validate.css";

// ── Schema constants (mirror wallets.schema.json) ─────────────────────────────

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

// ── Validator ─────────────────────────────────────────────────────────────────

type ValidationError = { path: string; message: string };

function validateManifest(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [{ path: "(root)", message: "Manifest must be a JSON object" }];
  }

  const obj = raw as Record<string, unknown>;

  for (const field of ["agent", "project", "ecosystem", "wallets"]) {
    if (!(field in obj)) {
      errors.push({ path: field, message: `Required field "${field}" is missing` });
    }
  }

  if ("agent" in obj && (typeof obj.agent !== "string" || (obj.agent as string).length === 0)) {
    errors.push({ path: "agent", message: '"agent" must be a non-empty string' });
  }
  if ("project" in obj && (typeof obj.project !== "string" || (obj.project as string).length === 0)) {
    errors.push({ path: "project", message: '"project" must be a non-empty string' });
  }
  if ("ecosystem" in obj && typeof obj.ecosystem !== "string") {
    errors.push({ path: "ecosystem", message: '"ecosystem" must be a string' });
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

        for (const f of ["address", "chain", "role", "verification_method"]) {
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
        if ("verification_method" in wallet && !VALID_VERIFICATION_METHODS.includes(wallet.verification_method as string)) {
          errors.push({ path: `${prefix}.verification_method`, message: `"verification_method" must be one of: ${VALID_VERIFICATION_METHODS.join(", ")}` });
        }
        if ("last_updated" in wallet && wallet.last_updated !== undefined) {
          if (typeof wallet.last_updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(wallet.last_updated as string)) {
            errors.push({ path: `${prefix}.last_updated`, message: '"last_updated" must be an ISO date (YYYY-MM-DD)' });
          }
        }
      });
    }
  }

  return errors;
}

// ── Starter template ──────────────────────────────────────────────────────────

const STARTER = `{
  "agent": "Your Agent Name",
  "project": "Your Project",
  "ecosystem": "Base",
  "website": "https://yourproject.xyz",
  "x": "@yourhandle",
  "wallets": [
    {
      "address": "0x0000000000000000000000000000000000000000",
      "chain": "base",
      "role": "payment_receiver",
      "verification_method": "repo_manifest",
      "notes": "Primary wallet for API revenue.",
      "last_updated": "2026-06-05",
      "active": true
    }
  ]
}`;

// ── Types ─────────────────────────────────────────────────────────────────────

type WalletEntry = {
  address: string;
  chain: string;
  role: string;
  notes?: string;
  active?: boolean;
};

type ParsedManifest = {
  agent: string;
  project: string;
  ecosystem: string;
  website?: string;
  x?: string;
  wallets: WalletEntry[];
};

function truncate(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ── Result components ─────────────────────────────────────────────────────────

function ValidResult({ manifest, onSubmit }: { manifest: ParsedManifest; onSubmit: () => void }) {
  return (
    <div className="val-result val-result-ok">
      <div className="val-result-header">
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--accent)" }}>check_circle</span>
        <div>
          <p className="val-result-title">Manifest Valid</p>
          <p className="val-result-sub">
            {manifest.agent} &mdash; {manifest.wallets.length} wallet{manifest.wallets.length !== 1 ? "s" : ""} declared
          </p>
        </div>
      </div>
      <div className="val-manifest-summary">
        <div className="val-summary-row"><span>Agent</span><strong>{manifest.agent}</strong></div>
        <div className="val-summary-row"><span>Project</span><strong>{manifest.project}</strong></div>
        <div className="val-summary-row"><span>Ecosystem</span><strong>{manifest.ecosystem}</strong></div>
        {manifest.website && (
          <div className="val-summary-row">
            <span>Website</span>
            <a href={manifest.website} target="_blank" rel="noreferrer" className="val-link">{manifest.website}</a>
          </div>
        )}
        {manifest.x && <div className="val-summary-row"><span>X Handle</span><strong>{manifest.x}</strong></div>}
      </div>
      <div className="val-wallets">
        <p className="val-wallets-label">Wallets</p>
        {manifest.wallets.map((w, i) => (
          <div key={i} className="val-wallet-row">
            <span className="val-wallet-role">{w.role}</span>
            <span className="val-wallet-chain">{w.chain}</span>
            <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="val-wallet-addr">
              {truncate(w.address)}
            </a>
            {w.notes && <span className="val-wallet-note">{w.notes}</span>}
            {w.active === false && <span className="val-wallet-inactive">inactive</span>}
          </div>
        ))}
      </div>
      <div className="val-actions">
        <button type="button" className="lp-btn-primary" onClick={onSubmit}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>send</span>
          Submit to Registry
        </button>
        <Link href="/registry" className="lp-btn-ghost">View Registry</Link>
      </div>
      <p className="val-actions-note">
        Submitting adds this manifest to the Zetta registry queue. Luca will verify and generate a financial profile.
      </p>
    </div>
  );
}

function ErrorResult({ errors }: { errors: ValidationError[] }) {
  return (
    <div className="val-result val-result-err">
      <div className="val-result-header">
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#ef4444" }}>cancel</span>
        <div>
          <p className="val-result-title">Validation Failed</p>
          <p className="val-result-sub">{errors.length} error{errors.length !== 1 ? "s" : ""} found</p>
        </div>
      </div>
      <div className="val-errors">
        {errors.map((e, i) => (
          <div key={i} className="val-error-row">
            <code className="val-error-path">{e.path}</code>
            <span className="val-error-msg">{e.message}</span>
          </div>
        ))}
      </div>
      <p className="val-fix-hint">
        Fix the errors above and validate again. See the{" "}
        <a href="https://github.com/danbuildss/agent-wallet-manifest/blob/main/schema/wallets.schema.json" target="_blank" rel="noreferrer" className="val-link">
          full schema
        </a>{" "}
        for reference.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ValidatePage() {
  const [json, setJson] = useState(STARTER);
  const [result, setResult] = useState<"idle" | "ok" | "err">("idle");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [parsed, setParsed] = useState<ParsedManifest | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState("");

  const validate = useCallback(() => {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      setResult("err");
      setErrors([{ path: "(root)", message: "Invalid JSON — could not parse" }]);
      setParsed(null);
      return;
    }
    const errs = validateManifest(raw);
    if (errs.length === 0) {
      setResult("ok");
      setErrors([]);
      setParsed(raw as ParsedManifest);
    } else {
      setResult("err");
      setErrors(errs);
      setParsed(null);
    }
    setSubmitState("idle");
    setSubmitMsg("");
  }, [json]);

  async function submitToRegistry() {
    if (!parsed) return;
    setSubmitState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: parsed.agent,
          x_handle: parsed.x ?? "",
          notes: `Submitted via /validate. Ecosystem: ${parsed.ecosystem}`,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; duplicate?: boolean };
      if (data.ok) {
        setSubmitState("done");
        setSubmitMsg(
          data.duplicate
            ? "Already in queue — Luca will verify soon."
            : "Submitted! Luca will generate your registry profile."
        );
      } else {
        setSubmitState("error");
        setSubmitMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setSubmitState("error");
      setSubmitMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="val-page">
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry">Registry</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/docs#api">API</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      <section className="val-hero">
        <p className="reg-label">Agent Wallet Manifest</p>
        <h1 className="val-h1">Validate your manifest.</h1>
        <p className="val-hero-sub">
          Paste your <code className="val-code">.agent/wallets.json</code> below.
          Valid manifests are automatically indexed in the{" "}
          <Link href="/registry" className="val-link">Zetta registry</Link> and
          generate a Luca financial profile.
        </p>
      </section>

      <section className="val-main">
        <div className="val-editor-wrap">
          <div className="val-editor-header">
            <span className="val-filename">.agent/wallets.json</span>
            <button
              type="button"
              className="val-clear-btn"
              onClick={() => { setJson(STARTER); setResult("idle"); setParsed(null); setErrors([]); }}
            >
              Reset
            </button>
          </div>
          <textarea
            className="val-editor"
            value={json}
            onChange={(e) => { setJson(e.target.value); setResult("idle"); }}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Wallet manifest JSON"
          />
          <div className="val-editor-footer">
            <button type="button" className="lp-btn-primary val-validate-btn" onClick={validate}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>verified</span>
              Validate
            </button>
            <a
              href="https://github.com/danbuildss/agent-wallet-manifest/blob/main/schema/wallets.schema.json"
              target="_blank"
              rel="noreferrer"
              className="lp-btn-ghost"
            >
              View Schema
            </a>
          </div>
        </div>

        <div className="val-result-wrap">
          {result === "idle" && (
            <div className="val-result-placeholder">
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: "var(--muted)", opacity: 0.4 }}>data_object</span>
              <p>Paste your manifest and click Validate</p>
            </div>
          )}
          {result === "ok" && parsed && (
            <>
              {submitState === "done" ? (
                <div className="val-submit-success">
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--accent)" }}>check_circle</span>
                  <p style={{ fontWeight: 600 }}>{submitMsg}</p>
                  <Link href="/registry" className="lp-btn-primary" style={{ marginTop: 12 }}>View Registry</Link>
                </div>
              ) : (
                <ValidResult manifest={parsed} onSubmit={submitToRegistry} />
              )}
              {submitState === "loading" && <p className="val-submitting">Submitting to registry&hellip;</p>}
              {submitState === "error" && <p className="val-form-error">{submitMsg}</p>}
            </>
          )}
          {result === "err" && <ErrorResult errors={errors} />}
        </div>
      </section>

      <section className="val-how">
        <p className="reg-label">How it works</p>
        <h2 className="val-h2">From manifest to registry profile.</h2>
        <div className="val-steps">
          {[
            { icon: "edit_document", step: "1", title: "Add wallets.json", body: "Create .agent/wallets.json in your repo. Declare wallet addresses, roles, and chain." },
            { icon: "verified", step: "2", title: "Validate here", body: "Paste and validate against the open schema. Zero errors means it's registry-ready." },
            { icon: "send", step: "3", title: "Submit to registry", body: "One click submits to Zetta. Luca indexes your wallets and builds a financial profile." },
            { icon: "workspace_premium", step: "4", title: "Get verified", body: "Earn the Verified badge. Paste it in your README as proof of financial identity." },
          ].map((s) => (
            <div key={s.step} className="val-step">
              <div className="val-step-icon">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <p className="val-step-num">Step {s.step}</p>
              <p className="val-step-title">{s.title}</p>
              <p className="val-step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="val-roles">
        <p className="reg-label">Reference</p>
        <h2 className="val-h2">Wallet roles.</h2>
        <div className="val-roles-grid">
          {[
            ["treasury", "Holds protocol reserves and long-term funds"],
            ["revenue", "Receives income from services or API usage"],
            ["expense", "Sends payments to providers or services"],
            ["operator", "Hot wallet for agent-initiated on-chain operations"],
            ["deployer", "Used to deploy contracts"],
            ["fee_recipient", "Receives protocol or platform fees"],
            ["payment_receiver", "Receives payments from users or integrations"],
            ["token_contract", "Address of an associated token contract"],
            ["token_bound_account", "ERC-6551 token-bound account"],
            ["unknown", "Role not yet classified"],
          ].map(([role, desc]) => (
            <div key={role} className="val-role-row">
              <code className="val-role-code">{role}</code>
              <span className="val-role-desc">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/luca">Luca</Link>
            <Link href="/developer">Developer</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Docs</p>
            <Link href="/docs#api">API Reference</Link>
            <Link href="/docs#agent">Agent Guide</Link>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Community</p>
            <a href="https://x.com/Zetta" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">&copy; 2026 Zetta AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
