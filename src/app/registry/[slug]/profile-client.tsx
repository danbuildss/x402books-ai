"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import type { Agent, Health, VerificationStatus } from "@/app/registry/types";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import type { SettlementClassification, SettlementPattern } from "@/lib/luca-classify";

// ── Settlement pattern display ────────────────────────────────────────────────

const PATTERN_STYLE: Record<SettlementPattern, { bg: string; color: string; border: string }> = {
  dormant:                       { bg: "rgba(125,130,141,0.08)", color: "var(--muted)",  border: "rgba(125,130,141,0.14)" },
  active_operational:            { bg: "rgba(109,184,116,0.08)", color: "var(--accent)", border: "rgba(109,184,116,0.15)" },
  stable_treasury:               { bg: "rgba(109,184,116,0.08)", color: "var(--accent)", border: "rgba(109,184,116,0.15)" },
  revenue_generating:            { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  high_spend_low_revenue:        { bg: "rgba(248,113,113,0.08)", color: "#f87171",        border: "rgba(248,113,113,0.15)" },
  heavy_outbound_settlement:     { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
  high_internal_transfer:        { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  recurring_flow_detected:       { bg: "rgba(91,143,168,0.08)",  color: "var(--blue)",   border: "rgba(91,143,168,0.15)"  },
  incomplete_wallet_role:        { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
  unknown_counterparty_dominant: { bg: "rgba(251,191,36,0.08)",  color: "#f59e0b",        border: "rgba(251,191,36,0.15)"  },
};

const PATTERN_LABEL: Record<SettlementPattern, string> = {
  dormant:                       "Dormant",
  active_operational:            "Active",
  stable_treasury:               "Stable Treasury",
  revenue_generating:            "Revenue Generating",
  high_spend_low_revenue:        "High Spend",
  heavy_outbound_settlement:     "Heavy Outbound",
  high_internal_transfer:        "High Internal Transfer",
  recurring_flow_detected:       "Recurring Flows",
  incomplete_wallet_role:        "Roles Unverified",
  unknown_counterparty_dominant: "Unknown Counterparties",
};

function SettlementSection({ classification }: { classification: SettlementClassification }) {
  const visible = classification.patterns.filter((p) => p !== "active_operational");
  return (
    <section className="prof-section">
      <p className="prof-section-title">Settlement Profile</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: classification.signals.length > 0 ? 10 : 0 }}>
        {classification.patterns.map((p) => {
          const s = PATTERN_STYLE[p];
          return (
            <span key={p} style={{ fontSize: "0.72rem", padding: "3px 9px", borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 500 }}>
              {PATTERN_LABEL[p]}
            </span>
          );
        })}
      </div>
      {classification.signals.length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginTop: 4 }}>
          {classification.signals.join(" · ")}
        </p>
      )}
      {visible.includes("incomplete_wallet_role") && (
        <a href="/registry#verify" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--accent)", marginTop: 8, textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add_circle</span>
          Declare wallet roles to unlock full classification
        </a>
      )}
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

function xPfpUrl(handle: string) {
  return `https://unavatar.io/x/${handle.replace("@", "")}`;
}

// ── Shared badge components ───────────────────────────────────────────────────

function HealthBadge({ h }: { h: Health }) {
  const cls = h === "Healthy" ? "healthy" : h === "Stable" ? "stable" : h === "Watch" ? "watch" : h === "At Risk" ? "risk" : "pending";
  return <span className={`reg-health reg-health-${cls}`}>{h}</span>;
}

const STATUS_META: Record<VerificationStatus, { cls: string; label: string; icon?: string }> = {
  "Candidate":          { cls: "candidate",    label: "Candidate"          },
  "Needs Verification": { cls: "needs-verify", label: "Needs Verification" },
  "Verified":           { cls: "verified",     label: "Verified", icon: "verified" },
  "Luca Managed":       { cls: "luca-managed", label: "Luca Managed"       },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`reg-badge reg-vstatus reg-vstatus-${m.cls}`}>
      {m.icon && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{m.icon}</span>}
      {m.label}
    </span>
  );
}

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

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.x402books.xyz/registry/${slug}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button type="button" className="prof-share-btn" onClick={copy}>
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        {copied ? "check" : "link"}
      </span>
      {copied ? "Copied!" : "Copy profile link"}
    </button>
  );
}

// ── Embed button ──────────────────────────────────────────────────────────────

function EmbedButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const src = `https://www.x402books.xyz/registry/${slug}/card`;
  const snippet = `<iframe src="${src}" width="400" height="320" style="border:0;border-radius:12px;overflow:hidden;" loading="lazy"></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="prof-share-btn" onClick={() => setOpen(!open)} style={{ marginTop: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span>
        Embed card
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 10,
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
          padding: "12px 14px", width: 340, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8 }}>
            Paste this iframe in any README, doc, or page:
          </p>
          <pre style={{
            fontSize: "0.68rem", lineHeight: 1.5, color: "var(--ink)",
            background: "var(--surface-soft)", borderRadius: 6, padding: "8px 10px",
            whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 10,
            border: "1px solid var(--line)",
          }}>{snippet}</pre>
          <button type="button" onClick={copy} style={{
            width: "100%", padding: "7px 0", borderRadius: 7, border: "1px solid var(--line)",
            background: "var(--surface-soft)", color: copied ? "var(--accent)" : "var(--ink)",
            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied!" : "Copy snippet"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function ProfileAvatar({ agent }: { agent: Agent }) {
  const [failed, setFailed] = useState(false);
  if (failed || !agent.xHandle) {
    return (
      <div className="prof-avatar prof-avatar-fallback">
        {agent.name[0]}
      </div>
    );
  }
  const src = agent.pfp ?? xPfpUrl(agent.xHandle);
  return (
    <Image
      src={src}
      alt={agent.name}
      width={72}
      height={72}
      className="prof-avatar"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

// ── Agent Economics block (Luca only) ────────────────────────────────────────

function AgentEconomicsBlock({ economics }: { economics: AgentEconomicSummary }) {
  const s = economics;
  const netColor = s.netAgentPosition > 0.01 ? "#4ade80" : s.netAgentPosition < -0.01 ? "#f87171" : "var(--ink)";
  const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;

  return (
    <section className="prof-section">
      <p className="prof-section-title">Agent Economics · Last {s.periodDays}d</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["Inference Spend",   `-${usd(s.totalInferenceSpend)}`,   s.totalInferenceSpend  > 0 ? "#f87171" : undefined],
          ["Inference Revenue", `+${usd(s.totalInferenceRevenue)}`, s.totalInferenceRevenue > 0 ? "#4ade80" : undefined],
          ["Provider Spend",    `-${usd(s.providerSpend)}`,         undefined, s.topProvider ?? undefined],
          ["Fallback Usage",    `-${usd(s.fallbackProviderSpend)}`, undefined, s.fallbackUsageCount > 0 ? `${s.fallbackUsageCount} call${s.fallbackUsageCount === 1 ? "" : "s"}` : undefined],
          ["API Costs",         `-${usd(s.apiCosts)}`,              undefined],
          ["Wallet Inflows",    `+${usd(s.walletInflows)}`,         s.walletInflows > 0 ? "#4ade80" : undefined],
          ["Wallet Outflows",   `-${usd(s.walletOutflows)}`,        undefined],
        ].map(([label, value, color, sub]) => (
          <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>{label}</span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: "monospace", color: (color as string) ?? "var(--ink)" }}>{value}</span>
              {sub && <span style={{ color: "var(--muted)", fontSize: "0.72rem", marginLeft: 6 }}>{sub as string}</span>}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 4, fontSize: "0.85rem", fontWeight: 600 }}>
          <span>Net Position</span>
          <span style={{ fontFamily: "monospace", color: netColor }}>
            {s.netAgentPosition >= 0 ? "+" : ""}{usd(s.netAgentPosition)}
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 6, lineHeight: 1.5 }}>{s.lucaVerdict}</p>
      </div>
    </section>
  );
}

// ── Main profile ──────────────────────────────────────────────────────────────

export function ProfileClient({ agent, slug, economics, classification }: { agent: Agent; slug: string; economics?: AgentEconomicSummary; classification?: SettlementClassification }) {
  const hasScores = agent.financialActivityScore !== null || agent.partnershipFitScore !== null;

  return (
    <div className="prof-page">
      {/* Header */}
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

      <main className="prof-main">
        {/* Back */}
        <Link href="/registry" className="prof-back">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
          Agent Registry
        </Link>

        {/* Identity card */}
        <div className="prof-identity">
          <ProfileAvatar agent={agent} />
          <div className="prof-identity-info">
            <div className="prof-name-row">
              <h1 className="prof-name">{agent.name}</h1>
              <span className="prof-symbol">{agent.symbol}</span>
            </div>
            <div className="prof-badges">
              <span className={`reg-badge reg-eco reg-eco-${agent.ecosystem.toLowerCase()}`}>{agent.ecosystem}</span>
              <StatusBadge status={agent.verificationStatus} />
              <HealthBadge h={agent.treasuryHealth} />
            </div>
            <div className="prof-links">
              {agent.xHandle && (
                <a href={`https://x.com/${agent.xHandle.replace("@","")}`} target="_blank" rel="noreferrer" className="prof-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  {agent.xHandle}
                </a>
              )}
              {agent.website && (
                <a href={agent.website} target="_blank" rel="noreferrer" className="prof-link">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                  Website
                </a>
              )}
              {agent.bankrProfile && (
                <a href={agent.bankrProfile} target="_blank" rel="noreferrer" className="prof-link prof-link-bankr">
                  Bankr
                </a>
              )}
            </div>
          </div>
          <div className="prof-share-wrap">
            <ShareButton slug={slug} />
            <a href={`/registry/${slug}/card`} target="_blank" rel="noreferrer" className="prof-share-btn" style={{ textDecoration: "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>credit_card</span>
              View card
            </a>
            <EmbedButton slug={slug} />
          </div>
        </div>

        <div className="prof-body">
          {/* Luca's Verdict */}
          {agent.adminNotes && (
            <div className="prof-verdict">
              <div className="prof-verdict-label">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                Luca&apos;s Verdict
              </div>
              <p className="prof-verdict-text">{agent.adminNotes}</p>
              {agent.lastChecked && (
                <p className="prof-verdict-date">Last reviewed: {agent.lastChecked}</p>
              )}
            </div>
          )}

          <div className="prof-grid">
            {/* Scores */}
            {hasScores && (
              <section className="prof-section">
                <p className="prof-section-title">Luca Scores</p>
                {agent.financialActivityScore !== null && (
                  <ScoreBar label="Financial Activity" value={agent.financialActivityScore} />
                )}
                {agent.partnershipFitScore !== null && (
                  <ScoreBar label="Partnership Fit" value={agent.partnershipFitScore} />
                )}
              </section>
            )}

            {/* Settlement profile */}
            {classification && <SettlementSection classification={classification} />}

            {/* Agent Economics (Luca self-profile only) */}
            {economics && <AgentEconomicsBlock economics={economics} />}

            {/* Wallets */}
            <section className="prof-section">
              <p className="prof-section-title">Wallets</p>
              {agent.tokenAddress && (
                <div className="reg-card-wallet-row">
                  <span className="reg-wallet-label-pill reg-wallet-candidate">token contract</span>
                  <a href={`https://basescan.org/token/${agent.tokenAddress}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                    {truncate(agent.tokenAddress)}
                  </a>
                </div>
              )}
              {agent.wallets.map((w) => (
                <div key={w.address} className="reg-card-wallet-row">
                  <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>
                    {w.label}
                  </span>
                  <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                    {truncate(w.address)}
                  </a>
                  {w.notes && <span className="reg-wallet-note">{w.notes}</span>}
                </div>
              ))}
              {!agent.tokenAddress && agent.wallets.length === 0 && (
                <p className="reg-card-no-wallet">Wallet discovery pending — Luca is researching public data.</p>
              )}
            </section>

            {/* Evidence */}
            {agent.evidenceSources.length > 0 && (
              <section className="prof-section">
                <p className="prof-section-title">Evidence Sources</p>
                <div className="prof-pills">
                  {agent.evidenceSources.map((s) => (
                    <span key={s} className="reg-source-pill">{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Report CTA */}
            {(agent.tokenAddress || agent.wallets.length > 0) && (
              <section className="prof-section">
                <p className="prof-section-title">Treasury Report</p>
                <a
                  href={`/report/${agent.tokenAddress ?? agent.wallets[0].address}`}
                  className="prof-report-btn"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>description</span>
                  Get full treasury report →
                </a>
              </section>
            )}
          </div>

          {/* Footer note */}
          <p className="prof-footer-note">
            Luca analyzed public data associated with {agent.name}. These are candidate wallets — not verified unless marked Verified.{" "}
            <Link href="/registry#verify">Verify your agent →</Link>
          </p>
        </div>
      </main>

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
