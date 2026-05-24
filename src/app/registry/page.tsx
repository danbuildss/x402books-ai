"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import type { Agent, Ecosystem, Health, VerificationStatus } from "./types";
import { AGENTS } from "./data";

// ── Static fallback stats (used until live data loads) ────────────────────────

function computeStats(agents: Agent[]) {
  const walletCount = agents.filter(
    (a) => a.tokenAddress !== null || a.wallets.length > 0
  ).length;
  const reviewedCount = agents.filter(
    (a) => a.financialActivityScore !== null
  ).length;
  return [
    { label: "Agents Tracked",  value: String(agents.length) },
    { label: "Ecosystems",      value: "3"                   },
    { label: "Wallets Indexed", value: String(walletCount)   },
    { label: "Luca Reviewed",   value: String(reviewedCount) },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function xPfpUrl(handle: string) {
  return `https://unavatar.io/x/${handle.replace("@", "")}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 32 }: { agent: Agent; size?: number }) {
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

function HealthBadge({ h }: { h: Health }) {
  const cls = h === "Healthy" ? "healthy" : h === "Stable" ? "stable" : h === "Watch" ? "watch" : h === "At Risk" ? "risk" : "pending";
  return <span className={`reg-health reg-health-${cls}`}>{h}</span>;
}

const STATUS_META: Record<VerificationStatus, { cls: string; label: string; icon?: string }> = {
  "Candidate":          { cls: "candidate",     label: "Candidate"          },
  "Needs Verification": { cls: "needs-verify",  label: "Needs Verification" },
  "Verified":           { cls: "verified",      label: "Verified", icon: "verified" },
  "Luca Managed":       { cls: "luca-managed",  label: "Luca Managed"       },
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

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "var(--accent)" : pct >= 40 ? "var(--blue)" : "var(--muted)";
  return (
    <div className="reg-score-row">
      <span className="reg-score-label">{label}</span>
      <div className="reg-score-bar-wrap">
        <div className="reg-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="reg-score-val">{value}</span>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false);
  const hasScores = agent.financialActivityScore !== null || agent.partnershipFitScore !== null;

  return (
    <div className={`reg-card${expanded ? " expanded" : ""}`}>
      {/* Header row — always visible, click to toggle */}
      <button
        type="button"
        className="reg-card-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <AgentAvatar agent={agent} size={36} />

        <div className="reg-card-name-group">
          <span className="reg-card-name">
            {agent.name}
            {agent.gitlawbRepo && (
              <span className="reg-gitlawb-dot" title="Wallet declared via Gitlawb repo">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </span>
            )}
          </span>
          <span className="reg-card-sym">{agent.symbol}</span>
        </div>

        <div className="reg-card-badges">
          <EcoBadge eco={agent.ecosystem} />
          <StatusBadge status={agent.verificationStatus} />
          <HealthBadge h={agent.treasuryHealth} />
        </div>

        {hasScores && (
          <div className="reg-card-score-hint" title="Partnership fit score">
            <span className="reg-score-hint-val">{agent.partnershipFitScore}</span>
            <span className="reg-score-hint-label">score</span>
          </div>
        )}

        <span className="material-symbols-outlined reg-card-chevron">
          {expanded ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="reg-card-body">

          {/* Links row */}
          {(agent.website || agent.xHandle || agent.bankrProfile || agent.gitlawbRepo) && (
            <div className="reg-card-links">
              {agent.website && (
                <a href={agent.website} target="_blank" rel="noreferrer" className="reg-card-link">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                  Website
                </a>
              )}
              {agent.xHandle && (
                <a href={`https://x.com/${agent.xHandle.replace("@","")}`} target="_blank" rel="noreferrer" className="reg-card-link">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  {agent.xHandle}
                </a>
              )}
              {agent.bankrProfile && (
                <a href={agent.bankrProfile} target="_blank" rel="noreferrer" className="reg-card-link reg-card-link-bankr">
                  Bankr profile
                </a>
              )}
              {agent.gitlawbRepo && (
                <a href={agent.gitlawbRepo} target="_blank" rel="noreferrer" className="reg-card-link reg-card-link-gitlawb">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Gitlawb repo
                </a>
              )}
            </div>
          )}

          {/* Token address */}
          {agent.tokenAddress && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Token Address (Base)</p>
              <div className="reg-card-wallet-row">
                <span className="reg-wallet-label-pill reg-wallet-candidate">token contract</span>
                <a
                  href={`https://basescan.org/token/${agent.tokenAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="reg-mono reg-wallet-addr"
                >
                  {truncate(agent.tokenAddress)}
                </a>
              </div>
            </div>
          )}

          {/* Wallets */}
          {agent.wallets.length > 0 && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Wallets</p>
              {agent.wallets.map((w) => (
                <div key={w.address} className="reg-card-wallet-row">
                  <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>
                    {w.label}
                  </span>
                  <a
                    href={`https://basescan.org/address/${w.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="reg-mono reg-wallet-addr"
                  >
                    {truncate(w.address)}
                  </a>
                  {w.notes && <span className="reg-wallet-note">{w.notes}</span>}
                </div>
              ))}
            </div>
          )}

          {/* No wallet state */}
          {!agent.tokenAddress && agent.wallets.length === 0 && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Wallets</p>
              <p className="reg-card-no-wallet">Wallet discovery pending — Luca is researching public data.</p>
            </div>
          )}

          {/* Financial scores */}
          {hasScores && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Luca Scores</p>
              {agent.financialActivityScore !== null && (
                <ScoreBar label="Financial Activity" value={agent.financialActivityScore} />
              )}
              {agent.partnershipFitScore !== null && (
                <ScoreBar label="Partnership Fit" value={agent.partnershipFitScore} />
              )}
              {agent.lastChecked && (
                <p className="reg-card-last-checked">Last reviewed: {agent.lastChecked}</p>
              )}
            </div>
          )}

          {/* Evidence sources */}
          {agent.evidenceSources.length > 0 && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Evidence Sources</p>
              <div className="reg-card-sources">
                {agent.evidenceSources.map((s) => (
                  <span key={s} className="reg-source-pill">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Outreach status */}
          {agent.outreachStatus && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Outreach Status</p>
              <span className={`reg-outreach-pill reg-outreach-${agent.outreachStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                {agent.outreachStatus}
              </span>
            </div>
          )}

          {/* Luca's notes */}
          {agent.adminNotes && (
            <div className="reg-card-section">
              <p className="reg-card-section-title">Luca&apos;s Notes</p>
              <p className="reg-card-notes">{agent.adminNotes}</p>
            </div>
          )}

          {/* Profile link + footer note */}
          <div className="reg-card-footer-note">
            <Link href={`/registry/${toSlug(agent.name)}`} className="reg-card-profile-link">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
              View full profile
            </Link>
            <span style={{ display: "block", marginTop: 8 }}>
              Luca analyzed public data associated with {agent.name}. These are candidate wallets only —
              not verified unless marked Verified.{" "}
              <a href="#verify" onClick={() => setExpanded(false)}>Verify your agent →</a>
            </span>
          </div>
        </div>
      )}
    </div>
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
      "role": "fee_recipient",
      "chain": "base"
    }
  ]
}`;

function VerifyCTA() {
  const [tab, setTab] = useState<"manual" | "gitlawb">("gitlawb");
  const [form, setForm] = useState({ agent_name: "", wallet_address: "", x_handle: "", notes: "", gitlawb_repo: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

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
              "Listed across x402Books platform",
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
              <p>{msg}</p>
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
                    Add a <code className="reg-code">.x402books/wallets.json</code> file to your Gitlawb or GitHub repo to declare your agent&apos;s wallets. Luca will detect it and upgrade your registry confidence level.
                  </p>
                  <ol className="reg-gitlawb-steps">
                    <li>
                      <span className="reg-step-num">1</span>
                      <div>
                        <strong>Create the file</strong>
                        <p>Add <code className="reg-code">.x402books/wallets.json</code> to your repo root</p>
                      </div>
                    </li>
                    <li>
                      <span className="reg-step-num">2</span>
                      <div>
                        <strong>Declare your wallets</strong>
                        <p>Use the schema below — treasury, revenue, expense, deployer</p>
                      </div>
                    </li>
                    <li>
                      <span className="reg-step-num">3</span>
                      <div>
                        <strong>Submit your repo URL</strong>
                        <p>Luca will verify and upgrade your listing</p>
                      </div>
                    </li>
                  </ol>
                  <div className="reg-schema-wrap">
                    <div className="reg-schema-header">
                      <span className="reg-schema-filename">.x402books/wallets.json</span>
                      <button type="button" className="reg-copy-btn" onClick={copySchema}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {copied ? "check" : "content_copy"}
                        </span>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="reg-schema-code">{WALLETS_JSON_EXAMPLE}</pre>
                  </div>
                  <form className="reg-verify-form" onSubmit={submit}>
                    <div className="reg-field">
                      <label>Agent Name</label>
                      <input type="text" placeholder="e.g. Bankr" value={form.agent_name}
                        onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                    </div>
                    <div className="reg-field">
                      <label>Wallet Address <span className="reg-field-opt">(primary wallet)</span></label>
                      <input type="text" placeholder="0x…" value={form.wallet_address}
                        onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))} required />
                    </div>
                    <div className="reg-field">
                      <label>Gitlawb / GitHub Repo URL <span className="reg-field-opt">(where wallets.json lives)</span></label>
                      <input type="text" placeholder="https://github.com/yourorg/yourrepo" value={form.gitlawb_repo}
                        onChange={(e) => setForm((f) => ({ ...f, gitlawb_repo: e.target.value }))} />
                    </div>
                    {state === "error" && <p className="reg-form-error">{msg}</p>}
                    <button type="submit" className="reg-submit-btn" disabled={state === "loading"}>
                      {state === "loading" ? "Submitting…" : "Submit via Gitlawb"}
                    </button>
                  </form>
                </div>
              ) : (
                <form className="reg-verify-form" onSubmit={submit}>
                  <div className="reg-field">
                    <label>Agent Name</label>
                    <input type="text" placeholder="e.g. Bankr" value={form.agent_name}
                      onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                  </div>
                  <div className="reg-field">
                    <label>Wallet Address</label>
                    <input type="text" placeholder="0x…" value={form.wallet_address}
                      onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))} required />
                  </div>
                  <div className="reg-field">
                    <label>X / Twitter Handle <span className="reg-field-opt">(optional)</span></label>
                    <input type="text" placeholder="@handle" value={form.x_handle}
                      onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))} />
                  </div>
                  <div className="reg-field">
                    <label>Notes <span className="reg-field-opt">(optional)</span></label>
                    <textarea placeholder="Wallet role, ecosystem, anything we should know…" rows={3}
                      value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
              <span className="reg-audit-by">by Luca · x402Books AI</span>
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
            <div className="reg-audit-row"><span>Net Flow (30d)</span><strong className="reg-positive">+$521.58</strong></div>
            <div className="reg-audit-row"><span>Treasury Health</span><HealthBadge h="Stable" /></div>
            <div className="reg-audit-row"><span>Financial Activity</span><strong>40 / 100</strong></div>
            <div className="reg-audit-row"><span>Partnership Fit</span><strong>51 / 100</strong></div>
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

export default function RegistryPage() {
  const [agents, setAgents]         = useState<Agent[]>(AGENTS);
  const [fromSupabase, setFromSupabase] = useState(false);
  const [search, setSearch]         = useState("");
  const [ecoFilter, setEcoFilter]   = useState<"All" | Ecosystem>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | VerificationStatus>("All");

  useEffect(() => {
    fetch("/api/registry/agents")
      .then((r) => r.json())
      .then((data: { agents?: Agent[]; fromSupabase?: boolean }) => {
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents(data.agents);
          setFromSupabase(data.fromSupabase ?? false);
        }
      })
      .catch(() => {
        // Silently fall back to static AGENTS
      });
  }, []);

  const STATS = computeStats(agents);

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

  return (
    <div className="reg-page">
      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
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
          x402Books AI indexes agent wallets across Base, BANKR, and Virtuals —
          sourced and scored by Luca. All entries start as Candidate until teams
          submit wallet proof.
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

      {/* ── Agent Registry ── */}
      <section className="reg-section" id="agents">
        {fromSupabase && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, color: "var(--muted)" }}>
            <span style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 4px #22c55e",
            }} />
            Live data from Supabase
          </div>
        )}
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
            {(["All", "BANKR", "Virtuals", "Base"] as const).map((opt) => (
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
          <div className="reg-eco-filter reg-status-filter">
            {(["All", "Candidate", "Needs Verification", "Verified", "Luca Managed"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`reg-eco-btn${statusFilter === opt ? " active" : ""}`}
                onClick={() => setStatusFilter(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="reg-cards">
          {filtered.length === 0 ? (
            <div className="reg-empty-cards">No agents match your filters.</div>
          ) : (
            filtered.map((a) => <AgentCard key={a.name} agent={a} />)
          )}
        </div>

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
