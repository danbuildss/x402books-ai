"use client";

import { useState } from "react";
import Link from "next/link";

const EXAMPLE_MANIFEST = `{
  "version": "1.0",
  "agent": "My Agent",
  "project": "My Project",
  "ecosystem": "base",
  "website": "https://myagent.xyz",
  "x": "@myagent",
  "wallets": [
    {
      "address": "0xabc...def",
      "chain": "base",
      "role": "treasury",
      "label": "Main treasury",
      "active": true,
      "last_updated": "2025-01-01",
      "verification_method": "repo_manifest"
    },
    {
      "address": "0x123...456",
      "chain": "base",
      "role": "fee_recipient",
      "label": "Inference fees",
      "active": true,
      "verification_method": "repo_manifest"
    }
  ]
}`;

const FIELDS_ROOT = [
  { name: "version",   type: "string",         req: false, desc: 'Manifest version. Use "1.0".' },
  { name: "agent",     type: "string",         req: true,  desc: "Canonical name of your agent." },
  { name: "project",   type: "string",         req: false, desc: "Parent project or product name." },
  { name: "ecosystem", type: "string",         req: false, desc: "Primary chain ecosystem (base, ethereum, solana…)." },
  { name: "website",   type: "string (URL)",   req: false, desc: "Agent or project website." },
  { name: "x",         type: "string",         req: false, desc: "X/Twitter handle, with or without @." },
  { name: "did",       type: "string (DID)",   req: false, desc: 'DID URI (e.g. did:web:myagent.xyz). For advanced identity binding.' },
  { name: "wallets",   type: "WalletEntry[]",  req: true,  desc: "Array of wallet declarations. At least one required." },
];

const FIELDS_WALLET = [
  { name: "address",             type: "string (0x…)",  req: true,  desc: "EVM address. Must match 0x + 40 hex chars." },
  { name: "chain",               type: "Chain enum",    req: true,  desc: "Chain identifier. See valid chains below." },
  { name: "role",                type: "Role enum",     req: true,  desc: "Wallet's financial function. See valid roles below." },
  { name: "label",               type: "string",        req: false, desc: "Human-readable label shown in the registry UI." },
  { name: "active",              type: "boolean",       req: false, desc: "Whether this wallet is currently in use. Defaults to true." },
  { name: "last_updated",        type: "YYYY-MM-DD",    req: false, desc: "ISO date of the last change to this entry." },
  { name: "verification_method", type: "VerifMethod",   req: false, desc: "How ownership is proven. See methods below." },
  { name: "notes",               type: "string",        req: false, desc: "Optional free-text context." },
];

const VALID_CHAINS = [
  "base", "ethereum", "arbitrum", "optimism", "polygon",
  "solana", "avalanche", "bnb", "zora", "blast",
  "linea", "scroll", "mode", "other",
];

const VALID_ROLES = [
  { role: "treasury",          desc: "Long-term reserve holdings" },
  { role: "revenue",           desc: "Incoming payments / fees" },
  { role: "expense",           desc: "Outgoing operational costs" },
  { role: "operator",          desc: "Day-to-day operational signer" },
  { role: "deployer",          desc: "Contract deployment address" },
  { role: "fee_recipient",     desc: "Protocol or inference fee collection" },
  { role: "payment_receiver",  desc: "General payment receipt" },
  { role: "token_contract",    desc: "ERC-20 token contract address" },
  { role: "token_bound_account", desc: "ERC-6551 token-bound account" },
  { role: "unknown",           desc: "Role not yet classified" },
];

const VALID_METHODS = [
  { method: "repo_manifest",       desc: "Manifest lives in the agent's public repo" },
  { method: "on_chain_signature",  desc: "Signed message from the address" },
  { method: "dns_record",          desc: "DNS TXT record on the agent's domain" },
  { method: "social_post",         desc: "Public post linking wallet to identity" },
  { method: "multisig_ownership",  desc: "Multisig with verified signers" },
];

export default function Erc8004Client() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(EXAMPLE_MANIFEST).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/docs" style={{ color: "var(--accent)", textDecoration: "none" }}>Docs</Link>
        {" / "}ERC-8004
      </p>

      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
          Open Standard · v1.0
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
          ERC-8004: Wallet Manifest Standard
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 600 }}>
          ERC-8004 defines <code style={{ fontSize: "0.88rem", background: "var(--code-bg, rgba(0,0,0,0.06))", padding: "1px 5px", borderRadius: 4 }}>.agent/wallets.json</code> —
          an open file format for autonomous agents to declare their financial identity across any chain.
          It is an identity standard, not a financial attribution standard. Declaring a wallet does not
          prove ownership; verification is a separate, higher-trust step.
        </p>
      </div>

      {/* Key principles */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Design principles
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { t: "One file, one location", b: "Always .agent/wallets.json in the repo root. No configuration, no discovery phase." },
            { t: "Chain-agnostic",          b: "Supports EVM and non-EVM chains. Multi-chain agents declare all wallets in a single file." },
            { t: "Role-first",              b: "Every wallet declares its purpose — treasury, fee_recipient, deployer, etc. No ambiguity." },
            { t: "Open by default",         b: "The manifest is public. Financial transparency is the goal. Private manifests defeat the purpose." },
          ].map(p => (
            <div key={p.t} style={{ padding: "16px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 5 }}>{p.t}</p>
              <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6 }}>{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* File location */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          File location
        </h2>
        <div style={{ background: "var(--code-bg, rgba(0,0,0,0.04))", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px", fontSize: "0.82rem", lineHeight: 1.8 }}>
          <code>
            my-agent-repo/<br />
            &nbsp;&nbsp;.agent/<br />
            &nbsp;&nbsp;&nbsp;&nbsp;<strong>wallets.json</strong> &nbsp;← required<br />
            &nbsp;&nbsp;src/<br />
            &nbsp;&nbsp;README.md
          </code>
        </div>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
          The <code>.agent/</code> directory is the agent identity namespace. Future ERC-8004 extensions
          (tool declarations, capability manifests) will live alongside wallets.json here.
        </p>
      </section>

      {/* Example */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", margin: 0 }}>
            Example manifest
          </h2>
          <button onClick={copy} style={{
            padding: "5px 12px", borderRadius: 6,
            border: "1px solid var(--line)", background: "var(--surface)",
            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            color: copied ? "var(--accent)" : "var(--muted)",
          }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <pre style={{
          fontSize: "0.78rem", lineHeight: 1.7,
          background: "var(--code-bg, rgba(0,0,0,0.04))", borderRadius: 10,
          padding: "18px 20px", overflowX: "auto", margin: 0,
          border: "1px solid var(--line)",
        }}>
          <code>{EXAMPLE_MANIFEST}</code>
        </pre>
      </section>

      {/* Root fields */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Root fields
        </h2>
        <FieldTable rows={FIELDS_ROOT} />
      </section>

      {/* Wallet entry fields */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Wallet entry fields
        </h2>
        <FieldTable rows={FIELDS_WALLET} />
      </section>

      {/* Valid enums */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Valid chains
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {VALID_CHAINS.map(c => (
            <code key={c} style={{
              fontSize: "0.76rem", padding: "3px 9px", borderRadius: 6,
              background: "var(--code-bg, rgba(0,0,0,0.04))", border: "1px solid var(--line)",
            }}>{c}</code>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Valid roles
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {VALID_ROLES.map(r => (
            <div key={r.role} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <code style={{
                fontSize: "0.76rem", padding: "2px 8px", borderRadius: 5, flexShrink: 0, minWidth: 160,
                background: "var(--code-bg, rgba(0,0,0,0.04))", border: "1px solid var(--line)",
              }}>{r.role}</code>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 10 }}>
          Note: <code>token_contract</code> wallets are never attributed in financial books (settlement revenue, treasury balance).
          They represent the token contract address, not a receivable wallet.
        </p>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Verification methods
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {VALID_METHODS.map(m => (
            <div key={m.method} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
              <code style={{
                fontSize: "0.76rem", padding: "2px 8px", borderRadius: 5, flexShrink: 0, minWidth: 180,
                background: "var(--code-bg, rgba(0,0,0,0.04))", border: "1px solid var(--line)",
              }}>{m.method}</code>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Validation */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          Validation
        </h2>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
          Zetta validates manifests against this spec at index time. You can pre-validate before submitting:
        </p>
        <pre style={{
          fontSize: "0.78rem", lineHeight: 1.7,
          background: "var(--code-bg, rgba(0,0,0,0.04))", borderRadius: 10,
          padding: "14px 18px", overflowX: "auto", margin: 0,
          border: "1px solid var(--line)",
        }}>
          <code>{`curl -X POST https://zettaai.co/api/validate-manifest \\
  -H "Content-Type: application/json" \\
  -d @.agent/wallets.json`}</code>
        </pre>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
          Returns <code>{`{ ok: true }`}</code> or <code>{`{ ok: false, errors: [...] }`}</code> with path-specific error messages.
        </p>
      </section>

      {/* Identity vs attribution note */}
      <section style={{
        marginBottom: 48, padding: "18px 20px", borderRadius: 10,
        border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)",
        borderLeft: "3px solid #F4B942",
      }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>Identity ≠ Attribution</p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7 }}>
          ERC-8004 is an <strong>identity declaration</strong>. Declaring a wallet in your manifest does not
          automatically attribute all transactions on that wallet to your agent in Zetta&apos;s financial books.
          Attribution requires the manifest to be verified (<code>evidenceSource = &quot;manifest&quot;</code>) and the wallet role
          to be books-eligible (not <code>token_contract</code>). Quarantined inflows exist for transactions that
          cannot be cleanly attributed.
        </p>
      </section>

      {/* Footer */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        {[
          { href: "/register",   label: "Register your agent" },
          { href: "/developer",  label: "Developer portal" },
          { href: "/docs",       label: "Full docs" },
          { href: "/registry",   label: "Browse registry" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            {l.label} →
          </Link>
        ))}
      </div>
    </main>
  );
}

function FieldTable({ rows }: { rows: { name: string; type: string; req: boolean; desc: string }[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {["Field", "Type", "Required", "Description"].map(h => (
              <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                <code style={{ fontSize: "0.77rem", background: "var(--code-bg, rgba(0,0,0,0.04))", padding: "1px 5px", borderRadius: 4 }}>{r.name}</code>
              </td>
              <td style={{ padding: "10px 12px", color: "var(--muted)", whiteSpace: "nowrap", fontSize: "0.75rem" }}>{r.type}</td>
              <td style={{ padding: "10px 12px", textAlign: "center" }}>
                {r.req
                  ? <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.72rem" }}>yes</span>
                  : <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>no</span>}
              </td>
              <td style={{ padding: "10px 12px", color: "var(--muted)", lineHeight: 1.5 }}>{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
