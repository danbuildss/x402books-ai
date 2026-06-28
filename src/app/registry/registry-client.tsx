"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { toSlug } from "./[slug]/slug";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import type { PublicAgent, Ecosystem, VerificationStatus } from "./types";
import type { AgentGDPEntry } from "@/lib/agent-gdp";
import type { AgentMomentum } from "@/lib/agent-momentum";
import { SiteFooter } from "@/components/site-footer";

// ── Sort constants ────────────────────────────────────────────────────────────

const VSTATUS_ORDER: Record<VerificationStatus, number> = {
  "Luca Managed":       0,
  "Verified":           1,
  "Claimed":            2,
  "Wallets Declared":   3,
  "Needs Verification": 4,
  "Candidate":          5,
  "ERC-8004 Indexed":   6,
  "Awaiting Manifest":  7,
};

const PAGE_SIZE = 25;

// ── Stats ─────────────────────────────────────────────────────────────────────

const DECLARED_STATUSES: VerificationStatus[] = [
  "Wallets Declared", "Claimed", "Verified", "Luca Managed", "ERC-8004 Indexed",
];

function computeStats(agents: PublicAgent[], economics: Record<string, AgentGDPEntry>) {
  const manifestCount = agents.filter(
    (a) => DECLARED_STATUSES.includes(a.verificationStatus)
  ).length;
  const booksCount = Object.keys(economics).length;
  return [
    { label: "Agents Tracked",    value: String(agents.length) },
    { label: "Ecosystems",        value: "5"                   },
    { label: "Manifests Indexed", value: String(manifestCount) },
    { label: "With Books",        value: String(booksCount)    },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function xPfpUrl(handle: string) {
  return `https://unavatar.io/x/${handle.replace("@", "")}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 32 }: { agent: PublicAgent; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !agent.xHandle) {
    return (
      <div className="reg-agent-avatar" style={{ width: size, height: size, fontSize: size * 0.44 }}>
        {agent.name[0]}
      </div>
    );
  }
  const src = agent.pfp ?? xPfpUrl(agent.xHandle);
  return (
    <Image
      src={src}
      alt={agent.name}
      width={size}
      height={size}
      className="reg-agent-avatar reg-agent-avatar-img"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

function EcoBadge({ eco }: { eco: Ecosystem }) {
  return <span className={`reg-badge reg-eco reg-eco-${eco.toLowerCase()}`}>{eco}</span>;
}

const STATUS_META: Record<VerificationStatus, { cls: string; label: string; icon?: string }> = {
  "Candidate":          { cls: "candidate",        label: "Candidate"          },
  "Needs Verification": { cls: "needs-verify",     label: "Needs Verification" },
  "Wallets Declared":   { cls: "wallets-declared", label: "Wallets Declared"   },
  "Claimed":            { cls: "claimed",           label: "Claimed by Team", icon: "handshake" },
  "Verified":           { cls: "verified",          label: "Verified", icon: "verified" },
  "Luca Managed":       { cls: "luca-managed",      label: "Luca Managed"       },
  "ERC-8004 Indexed":   { cls: "candidate",         label: "ERC-8004 Indexed"   },
  "Awaiting Manifest":  { cls: "needs-verify",      label: "Awaiting Manifest"  },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`reg-badge reg-vstatus reg-vstatus-${m.cls}`}>
      {m.icon && (
        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{m.icon}</span>
      )}
      {m.label}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── Agent Row ─────────────────────────────────────────────────────────────────

function MomentumBadge({ m }: { m: AgentMomentum }) {
  const rev   = m.revenue;
  const icon  = rev.direction === "growing" ? "↑" : rev.direction === "declining" ? "↓" : "→";
  const color = rev.direction === "growing" ? "#6DB874" : rev.direction === "declining" ? "#ef4444" : "var(--muted)";
  const label = rev.direction === "stable" ? "stable" : `${Math.abs(rev.pct).toFixed(0)}%`;
  return (
    <span title={`Revenue momentum (30d): ${rev.direction}`} style={{
      fontSize: "0.67rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
      border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      color, fontFamily: "monospace",
    }}>
      {icon} {label}
    </span>
  );
}

function AgentRow({ agent, economics, momentum }: { agent: PublicAgent; economics?: AgentGDPEntry; momentum?: AgentMomentum }) {
  const slug = toSlug(agent.name);
  return (
    <Link href={`/registry/${slug}`} className="reg-row">
      <AgentAvatar agent={agent} size={32} />
      <div className="reg-row-name">
        <span className="reg-row-agent-name">{agent.name}</span>
        {agent.symbol && agent.symbol !== "—" && (
          <span className="reg-row-sym">{agent.symbol}</span>
        )}
      </div>
      <div className="reg-row-badges">
        <EcoBadge eco={agent.ecosystem} />
        <StatusBadge status={agent.verificationStatus} />
        {economics && (
          <span style={{
            fontSize: "0.67rem", fontWeight: 700, padding: "1px 7px",
            borderRadius: 99, background: "rgba(109,184,116,0.12)",
            border: "1px solid rgba(109,184,116,0.3)", color: "#6DB874",
            letterSpacing: "0.02em",
          }}>
            Books
          </span>
        )}
        {momentum && <MomentumBadge m={momentum} />}
      </div>
      <div className="reg-row-score-wrap">
        {economics ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "monospace", color: "var(--fg)" }}>
              {fmtUSD(economics.revenue_usd)}
            </span>
            <span style={{
              fontSize: "0.7rem",
              fontFamily: "monospace",
              color: economics.net_income_usd >= 0 ? "#6DB874" : "#ef4444",
            }}>
              {economics.net_income_usd >= 0 ? "+" : ""}{fmtUSD(economics.net_income_usd)}
            </span>
            <span className="reg-row-score-label">30d op. rev / net</span>
          </div>
        ) : (
          <span className="reg-row-score-empty">—</span>
        )}
      </div>
      <span className="material-symbols-outlined reg-row-arrow">chevron_right</span>
    </Link>
  );
}

// ── Verify CTA ────────────────────────────────────────────────────────────────

const WALLETS_JSON_EXAMPLE = `{
  "agent": "Your Agent Name",
  "xHandle": "@yourhandle",
  "ecosystem": "Base",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Main protocol treasury"
    },
    {
      "address": "0x...",
      "role": "fee",
      "chain": "base",
      "notes": "Fee recipient"
    },
    {
      "address": "0x...",
      "role": "deployer",
      "chain": "base",
      "notes": "Contract deployer"
    },
    {
      "address": "0x...",
      "role": "operator",
      "chain": "base",
      "notes": "Hot wallet / operational spend"
    }
  ]
}`;

type FetchedWallet = { address: string; role: string; label: string; chain: string; notes: string | null };

function VerifyCTA() {
  const [tab, setTab] = useState<"manual" | "gitlawb">("gitlawb");
  const [form, setForm] = useState({ agent_name: "", wallet_address: "", x_handle: "", notes: "", gitlawb_repo: "", b20_token_address: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [submittedSlug, setSubmittedSlug] = useState("");
  const [submittedRef, setSubmittedRef] = useState("");
  const [refCopied, setRefCopied] = useState(false);
  const [copied, setCopied] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [repoState, setRepoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [repoMsg, setRepoMsg] = useState("");
  const [fetchedWallets, setFetchedWallets] = useState<FetchedWallet[] | null>(null);
  const [fetchedAgent, setFetchedAgent] = useState("");
  const [fetchedRef, setFetchedRef] = useState("");

  async function submitRepo(e: React.FormEvent) {
    e.preventDefault();
    setRepoState("loading");
    setFetchedWallets(null);
    setFetchedAgent("");
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; agent?: string; wallets?: FetchedWallet[]; message?: string; ref_id?: string };
      if (data.ok) {
        setRepoState("done");
        setRepoMsg(data.message ?? "Manifest submitted successfully.");
        setFetchedWallets(data.wallets ?? null);
        setFetchedAgent(data.agent ?? "");
        setFetchedRef(data.ref_id ?? "");
      } else {
        setRepoState("error");
        setRepoMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setRepoState("error");
      setRepoMsg("Network error. Please try again.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string; duplicate?: boolean; slug?: string; ref_id?: string };
      if (data.ok) {
        setState("done");
        setSubmittedSlug(data.slug ?? "");
        setSubmittedRef(data.ref_id ?? "");
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

  function copySchema() {
    navigator.clipboard.writeText(WALLETS_JSON_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="reg-verify" id="verify">
      <div className="reg-verify-inner">
        <div className="reg-verify-text">
          <p className="reg-label">For Agent Teams</p>
          <h2 className="reg-h2">Verify your agent wallet.</h2>
          <p className="reg-verify-sub">
            Submit your wallet for verification and get a Luca-powered audit and Verified badge in the registry.
          </p>
          <div className="reg-verify-perks">
            {[
              "Verified badge on your listing",
              "Luca-powered audit example",
              "Listed across Zetta platform",
            ].map((p) => (
              <div key={p} className="reg-verify-perk">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--accent)" }}>check_circle</span>
                {p}
              </div>
            ))}
          </div>

          <div className="reg-trust-ladder">
            <p className="reg-trust-ladder-label">Verification levels</p>
            <div className="reg-trust-step">
              <span className="reg-badge reg-vstatus reg-vstatus-candidate">Candidate</span>
              <span>Luca found wallets from public data</span>
            </div>
            <div className="reg-trust-arrow">↓</div>
            <div className="reg-trust-step">
              <span className="reg-badge reg-vstatus reg-vstatus-needs-verify">Needs Verification</span>
              <span>Team submitted or repo-declared wallets</span>
            </div>
            <div className="reg-trust-arrow">↓</div>
            <div className="reg-trust-step">
              <span className="reg-badge reg-vstatus reg-vstatus-verified">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>
                Verified
              </span>
              <span>DID-linked proof via Gitlawb</span>
            </div>
          </div>
        </div>

        <div className="reg-verify-form-wrap">
          {state === "done" ? (
            <div className="reg-submit-success">
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--accent)" }}>check_circle</span>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{msg}</p>
              {submittedRef && (
                <div style={{
                  margin: "12px 0",
                  padding: "12px 14px",
                  background: "var(--surface-soft)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                    <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "1rem", color: "var(--fg)", letterSpacing: "0.05em" }}>{submittedRef}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(submittedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{refCopied ? "check" : "content_copy"}</span>
                    {refCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              {submittedSlug && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 6 }}>
                    Your profile will be live at:
                  </p>
                  <Link href={`/registry/${submittedSlug}`} style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
                    /registry/{submittedSlug}
                  </Link>
                </div>
              )}
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                Verification typically completes within 24–48 hours.
                Once approved, your agent&apos;s books are generated automatically.
                {submittedRef && " Keep your reference ID to track this submission."}
              </p>
            </div>
          ) : (
            <>
              <div className="reg-verify-tabs">
                <button
                  type="button"
                  className={`reg-verify-tab${tab === "gitlawb" ? " active" : ""}`}
                  onClick={() => setTab("gitlawb")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Verify via Gitlawb
                </button>
                <button
                  type="button"
                  className={`reg-verify-tab${tab === "manual" ? " active" : ""}`}
                  onClick={() => setTab("manual")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                  Manual Submit
                </button>
              </div>

              {tab === "gitlawb" ? (
                <div className="reg-gitlawb-panel">
                  <p className="reg-gitlawb-intro">
                    Add a <code className="reg-code">.agent/wallets.json</code> file to your GitHub or Gitlawb repo. Paste your repo URL below and Luca will read the manifest directly.
                  </p>

                  <div className="reg-schema-wrap">
                    <div className="reg-schema-header">
                      <span className="reg-schema-filename">.agent/wallets.json</span>
                      <button type="button" className="reg-copy-btn" onClick={copySchema}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {copied ? "check" : "content_copy"}
                        </span>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="reg-schema-code">{WALLETS_JSON_EXAMPLE}</pre>
                  </div>

                  {repoState === "done" && fetchedWallets ? (
                    <div className="reg-submit-success">
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--accent)" }}>check_circle</span>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>{fetchedAgent} — manifest received</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10 }}>
                        {fetchedWallets.length} wallet{fetchedWallets.length !== 1 ? "s" : ""} queued for Luca verification.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                        {fetchedWallets.map((w) => (
                          <div key={w.address} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 72 }}>{w.role}</span>
                            <code style={{ color: "var(--muted)", fontFamily: "monospace" }}>{w.address.slice(0, 10)}…{w.address.slice(-6)}</code>
                          </div>
                        ))}
                      </div>
                      {fetchedRef && (
                        <div style={{
                          padding: "10px 14px",
                          background: "var(--surface-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reference ID</p>
                            <p style={{ margin: 0, fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)", letterSpacing: "0.05em" }}>{fetchedRef}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(fetchedRef); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
                            style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{refCopied ? "check" : "content_copy"}</span>
                            {refCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                      <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                        Verification typically completes within 24–48 hours. Keep your reference ID.
                      </p>
                    </div>
                  ) : (
                    <form className="reg-verify-form" onSubmit={submitRepo}>
                      <div className="reg-field">
                        <label>GitHub / Gitlawb Repo URL</label>
                        <input
                          type="url"
                          placeholder="https://github.com/yourorg/yourrepo"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          required
                        />
                      </div>
                      {repoState === "error" && <p className="reg-form-error">{repoMsg}</p>}
                      <button type="submit" className="reg-submit-btn" disabled={repoState === "loading"}>
                        {repoState === "loading" ? "Fetching manifest…" : "Fetch & Submit Manifest"}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <form className="reg-verify-form" onSubmit={submit}>
                  <div className="reg-field">
                    <label>Agent Name</label>
                    <input type="text" placeholder="e.g. AEON" value={form.agent_name}
                      onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                  </div>
                  <div className="reg-field">
                    <label>Primary Wallet Address</label>
                    <input
                      type="text"
                      placeholder="0x…"
                      value={form.wallet_address}
                      onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                      pattern="^0x[0-9a-fA-F]{40}$"
                      title="Enter a valid Base wallet address (0x followed by 40 hex characters)"
                      required
                    />
                    {form.wallet_address.length > 0 && !/^0x[0-9a-fA-F]{40}$/.test(form.wallet_address) && (
                      <p className="reg-field-hint">Must be a valid address — 0x followed by 40 hex characters.</p>
                    )}
                  </div>
                  <div className="reg-field">
                    <label>X / Twitter Handle <span className="reg-field-opt">(optional)</span></label>
                    <input type="text" placeholder="@handle" value={form.x_handle}
                      onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))} />
                  </div>
                  <div className="reg-field">
                    <label>Notes <span className="reg-field-opt">(optional)</span></label>
                    <textarea placeholder="Wallet role, ecosystem, anything helpful…" rows={3}
                      value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="reg-field">
                    <label>B20 Token Address <span className="reg-field-opt">(optional — B20 tokens only)</span></label>
                    <input
                      type="text"
                      placeholder="0xB200… (must start with 0xB200 to be a B20 token)"
                      value={form.b20_token_address}
                      onChange={(e) => setForm((f) => ({ ...f, b20_token_address: e.target.value }))}
                      style={{ fontFamily: "monospace" }}
                    />
                    <p className="reg-field-hint" style={{ marginTop: 4 }}>
                      Only for B20 tokens on Base. Standard ERC-20 tokens ($LUCA, $BNKR, etc.) should not be entered here.
                      This field is reviewed manually — it does not activate indexing automatically.
                    </p>
                  </div>
                  {state === "error" && <p className="reg-form-error">{msg}</p>}
                  <button type="submit" className="reg-submit-btn" disabled={state === "loading"}>
                    {state === "loading" ? "Submitting…" : "Submit for Verification"}
                  </button>
                </form>
              )}
            </>
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
              <span className="reg-audit-by">by Luca · Zetta</span>
            </div>
            <EcoBadge eco="Base" />
          </div>
          <div className="reg-audit-body">
            <div className="reg-audit-row"><span>Agent</span><strong>Gitlawb</strong></div>
            <div className="reg-audit-row"><span>Token</span><strong>$GITLAWB</strong></div>
            <div className="reg-audit-row"><span>Wallet</span><strong className="reg-mono">0x5F98…3DBa3</strong></div>
            <div className="reg-audit-row"><span>Status</span><StatusBadge status="Needs Verification" /></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-row"><span>Transactions (30d)</span><strong>48</strong></div>
            <div className="reg-audit-row"><span>Revenue (30d)</span><strong className="reg-positive">$521.58</strong></div>
            <div className="reg-audit-row"><span>Net Income (30d)</span><strong className="reg-positive">+$112.44</strong></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-read">
              <span className="reg-audit-read-label">Luca&apos;s read</span>
              <p>Token contract with consistent 30-day activity and positive net flow. Strong public attribution on X. Treasury wallet claims exist but no direct wallet proof yet — verification recommended before upgrade to Verified status.</p>
            </div>
          </div>
          <div className="reg-audit-footer">
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="reg-audit-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Audit your agent — @AskLucaBot
            </a>
            <Link href="/luca" className="reg-audit-learn">Learn about Luca →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SortKey = "activity" | "verification" | "name";

export function RegistryClient({
  initialAgents,
  initialEconomics,
}: {
  initialAgents: PublicAgent[];
  initialEconomics: Record<string, AgentGDPEntry>;
}) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const [agents]    = useState<PublicAgent[]>(initialAgents);
  const [economics] = useState<Record<string, AgentGDPEntry>>(initialEconomics);
  const [momentum, setMomentum] = useState<Record<string, AgentMomentum>>({});

  // All filter state lives in the URL so back-navigation restores scroll + position
  const search       = searchParams.get("q") ?? "";
  const ecoFilter    = (searchParams.get("eco") ?? "All") as "All" | Ecosystem;
  const statusFilter = (searchParams.get("status") ?? "All") as "All" | VerificationStatus;
  const sortBy       = (searchParams.get("sort") ?? "activity") as SortKey;
  const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      const isDefault = !v || v === "All" || (k === "sort" && v === "activity") || (k === "page" && v === "1") || (k === "q" && !v);
      if (isDefault) { params.delete(k); } else { params.set(k, v); }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  function setSearch(v: string)                          { updateParams({ q: v, page: "1" }); }
  function setEcoFilter(v: "All" | Ecosystem)            { updateParams({ eco: v, page: "1" }); }
  function setStatusFilter(v: "All" | VerificationStatus){ updateParams({ status: v, page: "1" }); }
  function setSortBy(v: SortKey)                         { updateParams({ sort: v, page: "1" }); }
  function prevPage()                                    { updateParams({ page: String(page - 1) }); }
  function nextPage()                                    { updateParams({ page: String(page + 1) }); }

  useEffect(() => {
    fetch("/api/registry/momentum")
      .then((r) => r.json())
      .then((data: { ok?: boolean; momentum?: Record<string, AgentMomentum> }) => {
        if (data.ok && data.momentum) setMomentum(data.momentum);
      })
      .catch(() => {});
  }, []);

  const STATS = computeStats(agents, economics);

  // Filter
  const filtered = agents.filter((a) => {
    const matchEco    = ecoFilter === "All" || a.ecosystem === ecoFilter;
    const matchStatus = statusFilter === "All" || a.verificationStatus === statusFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      a.name.toLowerCase().includes(q) ||
      a.symbol.toLowerCase().includes(q) ||
      (a.xHandle && a.xHandle.toLowerCase().includes(q));
    return matchEco && matchStatus && matchSearch;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "activity": {
        const aEco = economics[toSlug(a.name)];
        const bEco = economics[toSlug(b.name)];
        // Agents with real books float above unattributed
        if (aEco && !bEco) return -1;
        if (!aEco && bEco) return 1;
        if (aEco && bEco) return bEco.revenue_usd - aEco.revenue_usd;
        // Among unattributed: sort by verification level
        return VSTATUS_ORDER[a.verificationStatus] - VSTATUS_ORDER[b.verificationStatus];
      }
      case "verification": {
        return VSTATUS_ORDER[a.verificationStatus] - VSTATUS_ORDER[b.verificationStatus];
      }
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start      = (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, sorted.length);

  return (
    <div className="reg-page">

      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry" style={{ color: "var(--accent)" }}>Registry</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/research">Research</Link>
          <Link href="/developer">API</Link>
          <Link href="/luca">Luca</Link>
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
        <h1 className="reg-h1">Agent Books for the agent economy.</h1>
        <p className="reg-hero-sub">
          Revenue, expenses, net income, and treasury activity for {STATS[0]?.value ?? "84+"} indexed agents across BANKR, Virtuals, AEON, and Base.
          Attribution requires a declared wallet manifest.
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
          <a href="#verify" className="lp-btn-primary">Submit Manifest</a>
          <a href="#agents" className="lp-btn-ghost">Browse Agent Books</a>
        </div>
      </section>

      {/* ── Agent Registry ── */}
      <section className="reg-section" id="agents">

        {/* Controls */}
        <div className="reg-table-controls">
          {/* Search */}
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

          {/* Ecosystem filter buttons */}
          <div className="reg-eco-filter">
            {(["All", "BANKR", "Virtuals", "Base", "AEON", "EigenCloud"] as const).map((opt) => (
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

          {/* Status + Sort selects */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <select
              className="reg-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | VerificationStatus)}
            >
              <option value="All">All Statuses</option>
              <option value="Candidate">Candidate</option>
              <option value="Needs Verification">Needs Verification</option>
              <option value="Wallets Declared">Wallets Declared</option>
              <option value="Claimed">Claimed</option>
              <option value="Verified">Verified</option>
              <option value="Luca Managed">Luca Managed</option>
            </select>
            <select
              className="reg-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="activity">Sort: Books First</option>
              <option value="verification">Sort: Verification</option>
              <option value="name">Sort: Name A–Z</option>
            </select>
          </div>
        </div>

        {/* Count + live dot */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {sorted.length === agents.length
              ? `${agents.length} agents`
              : `${sorted.length} of ${agents.length} agents`}
          </span>
        </div>

        {/* List */}
        <div className="reg-list">
          {paginated.length === 0 ? (
            <div className="reg-empty-cards">No agents match your filters.</div>
          ) : (
            paginated.map((a) => <AgentRow key={a.name} agent={a} economics={economics[toSlug(a.name)]} momentum={momentum[toSlug(a.name)]} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="reg-pagination">
            <button
              className="reg-page-btn"
              disabled={page <= 1}
              onClick={prevPage}
            >
              ← Prev
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {start}–{end} of {sorted.length}
            </span>
            <button
              className="reg-page-btn"
              disabled={page >= totalPages}
              onClick={nextPage}
            >
              Next →
            </button>
          </div>
        )}

        <p className="reg-table-note">
          All wallet addresses are candidate addresses sourced by Luca from public data. Nothing is Verified
          until an agent team submits proof.{" "}
          <a href="#verify">Submit your agent wallet →</a>
        </p>
      </section>

      {/* ── Luca Audit Example ── */}
      <LucaExample />

      {/* ── Verify CTA ── */}
      <VerifyCTA />

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}
