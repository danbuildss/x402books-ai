"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";

// ── Static agent data (v1 placeholders) ───────────────────────────────────────

type WalletRole = "Treasury" | "Operational" | "Deployer";
type Confidence = "Verified" | "Community" | "Unverified";

type Agent = {
  name: string;
  symbol: string;
  ecosystem: "BANKR" | "Virtuals";
  wallet: string;
  role: WalletRole;
  confidence: Confidence;
  inflow: string;
  outflow: string;
  health: "Healthy" | "Stable" | "Watch" | "At Risk";
};

const AGENTS: Agent[] = [
  { name: "AIXBT",          symbol: "$AIXBT",   ecosystem: "Virtuals", wallet: "0x7d3f...42f1", role: "Treasury",    confidence: "Verified",   inflow: "$84.2K",  outflow: "$12.1K", health: "Healthy" },
  { name: "Luna",           symbol: "$LUNA",    ecosystem: "Virtuals", wallet: "0x3a1c...9d02", role: "Operational", confidence: "Verified",   inflow: "$41.5K",  outflow: "$38.2K", health: "Stable"  },
  { name: "Vader AI",       symbol: "$VADER",   ecosystem: "Virtuals", wallet: "0x9f2e...7b44", role: "Treasury",    confidence: "Community",  inflow: "$19.8K",  outflow: "$4.3K",  health: "Healthy" },
  { name: "Griffain",       symbol: "$GRIFFAIN",ecosystem: "Virtuals", wallet: "0x5c8d...1e90", role: "Deployer",    confidence: "Community",  inflow: "$7.2K",   outflow: "$6.9K",  health: "Watch"   },
  { name: "Sekoia",         symbol: "$SEKOIA",  ecosystem: "Virtuals", wallet: "0x2b7a...c311", role: "Operational", confidence: "Unverified", inflow: "$3.1K",   outflow: "$2.8K",  health: "Stable"  },
  { name: "Degen Spartan",  symbol: "$DEGEN",   ecosystem: "BANKR",    wallet: "0x8e4f...5a27", role: "Treasury",    confidence: "Community",  inflow: "$22.4K",  outflow: "$9.7K",  health: "Healthy" },
  { name: "Truth Terminal", symbol: "$GOAT",    ecosystem: "BANKR",    wallet: "0x1d6b...f882", role: "Treasury",    confidence: "Verified",   inflow: "$156.3K", outflow: "$43.1K", health: "Healthy" },
  { name: "Simulacrum",     symbol: "$SIM",     ecosystem: "BANKR",    wallet: "0x4c9e...3d15", role: "Operational", confidence: "Unverified", inflow: "$1.4K",   outflow: "$1.2K",  health: "Stable"  },
  { name: "Orbit",          symbol: "$ORBIT",   ecosystem: "Virtuals", wallet: "0x6a2c...8b39", role: "Operational", confidence: "Community",  inflow: "$5.8K",   outflow: "$5.1K",  health: "Watch"   },
  { name: "Aiko",           symbol: "$AIKO",    ecosystem: "Virtuals", wallet: "0x0f5d...2e74", role: "Treasury",    confidence: "Unverified", inflow: "$2.6K",   outflow: "$0.9K",  health: "Healthy" },
];

const STATS = [
  { label: "Agents Tracked", value: "10" },
  { label: "Ecosystems",     value: "2"  },
  { label: "Wallets Indexed",value: "10" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  if (addr.includes("...")) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function ConfidenceBadge({ c }: { c: Confidence }) {
  return (
    <span className={`reg-badge reg-confidence reg-confidence-${c.toLowerCase()}`}>
      {c === "Verified" && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>}
      {c}
    </span>
  );
}

function RoleBadge({ role }: { role: WalletRole }) {
  return <span className={`reg-badge reg-role reg-role-${role.toLowerCase()}`}>{role}</span>;
}

function EcoBadge({ eco }: { eco: "BANKR" | "Virtuals" }) {
  return <span className={`reg-badge reg-eco reg-eco-${eco.toLowerCase()}`}>{eco}</span>;
}

function HealthBadge({ h }: { h: Agent["health"] }) {
  const cls = h === "Healthy" ? "healthy" : h === "Stable" ? "stable" : h === "Watch" ? "watch" : "risk";
  return <span className={`reg-health reg-health-${cls}`}>{h}</span>;
}

// ── Verify CTA ────────────────────────────────────────────────────────────────

function VerifyCTA() {
  const [form, setForm] = useState({ agent_name: "", wallet_address: "", x_handle: "", notes: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string; duplicate?: boolean };
      if (data.ok) {
        setState("done");
        setMsg(data.duplicate ? "Already submitted — we'll review it soon." : "Submitted! We'll verify and add your agent.");
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <section className="reg-verify" id="verify">
      <div className="reg-verify-inner">
        <div className="reg-verify-text">
          <p className="reg-label">For Agent Teams</p>
          <h2 className="reg-h2">Verify your agent wallet.</h2>
          <p className="reg-verify-sub">
            Submit your agent&apos;s wallet address for verification. We&apos;ll review it, run a Luca audit, and list it as Verified in the registry.
          </p>
          <div className="reg-verify-perks">
            {["Verified badge on your listing", "Luca-powered audit example", "Listed across x402Books platform"].map((p) => (
              <div key={p} className="reg-verify-perk">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--accent)" }}>check_circle</span>
                {p}
              </div>
            ))}
          </div>
        </div>

        <div className="reg-verify-form-wrap">
          {state === "done" ? (
            <div className="reg-submit-success">
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--accent)" }}>check_circle</span>
              <p>{msg}</p>
            </div>
          ) : (
            <form className="reg-verify-form" onSubmit={submit}>
              <div className="reg-field">
                <label>Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g. AIXBT"
                  value={form.agent_name}
                  onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))}
                  required
                />
              </div>
              <div className="reg-field">
                <label>Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x…"
                  value={form.wallet_address}
                  onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                  required
                />
              </div>
              <div className="reg-field">
                <label>X / Twitter Handle <span className="reg-field-opt">(optional)</span></label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={form.x_handle}
                  onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))}
                />
              </div>
              <div className="reg-field">
                <label>Notes <span className="reg-field-opt">(optional)</span></label>
                <textarea
                  placeholder="Wallet role, ecosystem, anything we should know…"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {state === "error" && <p className="reg-form-error">{msg}</p>}
              <button type="submit" className="reg-submit-btn" disabled={state === "loading"}>
                {state === "loading" ? "Submitting…" : "Submit for Verification"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Luca Audit Example ────────────────────────────────────────────────────────

function LucaExample() {
  return (
    <section className="reg-section" id="audit-example">
      <div className="reg-section-head">
        <p className="reg-label">Powered by Luca</p>
        <h2 className="reg-h2">What an agent audit looks like.</h2>
        <p className="reg-section-sub">Luca runs the audit, categorizes transactions, scores treasury health, and flags anomalies — instantly.</p>
      </div>
      <div className="reg-audit-wrap">
        <div className="reg-audit-card">
          <div className="reg-audit-header">
            <div className="reg-audit-header-left">
              <span className="reg-audit-tag">Agent Wallet Audit</span>
              <span className="reg-audit-by">by Luca · x402Books AI</span>
            </div>
            <EcoBadge eco="Virtuals" />
          </div>
          <div className="reg-audit-body">
            <div className="reg-audit-row"><span>Agent</span><strong>AIXBT</strong></div>
            <div className="reg-audit-row"><span>Token</span><strong>$AIXBT</strong></div>
            <div className="reg-audit-row"><span>Wallet</span><strong className="reg-mono">0x7d3f…42f1</strong></div>
            <div className="reg-audit-row"><span>Role</span><RoleBadge role="Treasury" /></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-row"><span>Total Inflow</span><strong className="reg-positive">+$84,200</strong></div>
            <div className="reg-audit-row"><span>Total Outflow</span><strong>$12,100</strong></div>
            <div className="reg-audit-row"><span>Net Flow</span><strong className="reg-positive">+$72,100</strong></div>
            <div className="reg-audit-row"><span>Treasury Health</span><HealthBadge h="Healthy" /></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-read">
              <span className="reg-audit-read-label">Luca&apos;s read</span>
              <p>Strong inflow concentration with low outflow pressure. Treasury is accumulating. No anomalies detected. Revenue quality is good — primary inflows are consistent and recurring.</p>
            </div>
          </div>
          <div className="reg-audit-footer">
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="reg-audit-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Audit your agent on Telegram — @AskLucaBot
            </a>
            <Link href="/luca" className="reg-audit-learn">Learn about Luca →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [search, setSearch] = useState("");
  const [ecoFilter, setEcoFilter] = useState<"All" | "BANKR" | "Virtuals">("All");

  const filtered = AGENTS.filter((a) => {
    const matchEco = ecoFilter === "All" || a.ecosystem === ecoFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q);
    return matchEco && matchSearch;
  });

  return (
    <div className="reg-page">
      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="/" className="lp-brand">
          <Logo />
        </Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/registry" style={{ color: "var(--accent)" }}>Registry</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="reg-hero">
        <p className="reg-label">Agent Financial Registry</p>
        <h1 className="reg-h1">Track the wallets behind agents.</h1>
        <p className="reg-hero-sub">
          x402Books AI indexes agent wallets across BANKR and Virtuals ecosystems —
          categorizing transactions, scoring treasury health, and flagging anomalies.
        </p>
        <div className="reg-hero-stats">
          {STATS.map((s) => (
            <div key={s.label} className="reg-hero-stat">
              <span className="reg-hero-stat-val">{s.value}</span>
              <span className="reg-hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="reg-hero-actions">
          <a href="#verify" className="lp-btn-primary">Verify Your Agent</a>
          <a href="#agents" className="lp-btn-ghost">Browse Registry</a>
        </div>
      </section>

      {/* ── Agent Table ── */}
      <section className="reg-section" id="agents">
        <div className="reg-table-controls">
          <div className="reg-search-wrap">
            <span className="material-symbols-outlined reg-search-icon">search</span>
            <input
              className="reg-search"
              type="text"
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="reg-eco-filter">
            {(["All", "BANKR", "Virtuals"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`reg-eco-btn${ecoFilter === opt ? " active" : ""}`}
                onClick={() => setEcoFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="reg-table-wrap">
          <table className="reg-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Ecosystem</th>
                <th>Wallet</th>
                <th>Role</th>
                <th>Confidence</th>
                <th>Inflow</th>
                <th>Outflow</th>
                <th>Health</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="reg-empty">No agents match your search.</td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.wallet}>
                    <td>
                      <div className="reg-agent-cell">
                        <div className="reg-agent-avatar">{a.name[0]}</div>
                        <div>
                          <div className="reg-agent-name">{a.name}</div>
                          <div className="reg-agent-sym">{a.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td><EcoBadge eco={a.ecosystem} /></td>
                    <td><span className="reg-mono reg-wallet">{truncate(a.wallet)}</span></td>
                    <td><RoleBadge role={a.role} /></td>
                    <td><ConfidenceBadge c={a.confidence} /></td>
                    <td><span className="reg-positive">{a.inflow}</span></td>
                    <td><span className="reg-muted">{a.outflow}</span></td>
                    <td><HealthBadge h={a.health} /></td>
                    <td>
                      <Link href={`/report/${a.wallet.replace("...", "0000")}`} className="reg-view-link">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="reg-table-note">
          Financial data is estimated from public onchain activity. Wallet addresses are truncated for display.
          <a href="#verify"> Submit your agent wallet</a> to be listed with accurate data.
        </p>
      </section>

      {/* ── Luca Audit Example ── */}
      <LucaExample />

      {/* ── Verify CTA ── */}
      <VerifyCTA />

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/luca">Meet Luca</Link>
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
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 x402Books AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
