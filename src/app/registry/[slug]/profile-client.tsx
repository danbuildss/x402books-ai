"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toPng } from "html-to-image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import type { Agent, Health, VerificationStatus } from "@/app/registry/types";
import type { AgentEconomicSummary } from "@/lib/agent-events";
import type { InferenceSummary } from "@/lib/inference-events";
import type { SettlementClassification, SettlementPattern } from "@/lib/luca-classify";
import type { ToolDecisionEvent } from "@/lib/tool-decisions";
import type { AgentBooks, AgentBooksUnattributed } from "@/lib/agent-books";

// ── Agent Books block ─────────────────────────────────────────────────────────

function AgentBooksBlock({ books }: { books: AgentBooks | AgentBooksUnattributed }) {
  const usd = (n: number) =>
    "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!books.attributed) {
    return (
      <section className="prof-section" style={{ borderLeft: "3px solid var(--line)", paddingLeft: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
        </div>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
          No books yet. This agent needs declared wallets before x402Books can generate revenue, expense, and profitability data.
        </p>
        <a
          href="https://docs.x402books.xyz/manifest"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.79rem", fontWeight: 600,
            color: "var(--accent)", textDecoration: "none",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_circle</span>
          Declare wallets with{" "}
          <code style={{ fontFamily: "monospace", background: "var(--line)", padding: "1px 5px", borderRadius: 3 }}>
            .agent/wallets.json
          </code>
        </a>
      </section>
    );
  }

  const f = books.financials;
  const netPositive = f.net_income_usd >= 0;

  return (
    <section className="prof-section">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p className="prof-section-title" style={{ margin: 0 }}>Agent Books</p>
        <span style={{
          fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 99,
          background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)",
          letterSpacing: "0.02em",
        }}>
          {books.period}
        </span>
      </div>

      {/* Primary stats: Revenue / Expenses / Net Income */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {([
          { label: "Revenue",    value: usd(f.revenue_usd),     color: f.revenue_usd > 0 ? "var(--accent)" : "var(--muted)" },
          { label: "Expenses",   value: usd(f.expenses_usd),    color: f.expenses_usd > 0 ? "#f87171"      : "var(--muted)" },
          { label: "Net Income", value: (netPositive ? "+" : "−") + usd(f.net_income_usd), color: netPositive ? "var(--accent)" : "#f87171" },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{
            display: "flex", flexDirection: "column", gap: 4,
            padding: "10px 12px", borderRadius: 8,
            background: "var(--surface-soft)", border: "1px solid var(--line)",
          }}>
            <span style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
              {label}
            </span>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color, letterSpacing: "-0.02em", fontFamily: "monospace" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.77rem", color: "var(--muted)", marginBottom: 12 }}>
        {f.margin_pct !== null && (
          <span>
            Margin{" "}
            <strong style={{ color: f.margin_pct >= 0 ? "var(--ink)" : "#f87171" }}>
              {f.margin_pct.toFixed(1)}%
            </strong>
          </span>
        )}
        <span>Transactions <strong style={{ color: "var(--ink)" }}>{f.tx_count}</strong></span>
        <span>Wallets analyzed <strong style={{ color: "var(--ink)" }}>{books.wallets.analyzed}</strong></span>
        {books.attribution.internal_transfers_removed > 0 && (
          <span style={{ color: "var(--muted)" }}>
            {books.attribution.internal_transfers_removed} internal transfers excluded
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>
          Source{" "}
          <strong style={{ color: "var(--ink)", textTransform: "capitalize" }}>
            {books.attribution.source}
          </strong>
        </span>
      </div>

      {/* Expense breakdown */}
      {books.breakdown.expenses_by_category.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>
            Expenses by Category
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {books.breakdown.expenses_by_category.slice(0, 4).map((e) => (
              <div key={e.category} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--muted)" }}>{e.label}</span>
                <span style={{ fontFamily: "monospace", color: "#f87171" }}>−{usd(e.total_usd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Luca financial summary */}
      {books.luca_summary && (
        <p style={{
          fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6,
          paddingTop: 10, borderTop: "1px solid var(--line)",
        }}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>Luca: </span>
          {books.luca_summary}
        </p>
      )}
    </section>
  );
}

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
  "Candidate":          { cls: "candidate",       label: "Candidate"          },
  "Needs Verification": { cls: "needs-verify",    label: "Needs Verification" },
  "Wallets Declared":   { cls: "wallets-declared", label: "Wallets Declared"  },
  "Claimed":            { cls: "claimed",          label: "Claimed by Team", icon: "handshake" },
  "Verified":           { cls: "verified",         label: "Verified", icon: "verified" },
  "Luca Managed":       { cls: "luca-managed",     label: "Luca Managed"       },
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

// ── Card helpers (shared with share modal) ───────────────────────────────────

const CARD_PATTERN_LABEL: Partial<Record<SettlementPattern, string>> = {
  stable_treasury:           "Stable Treasury",
  revenue_generating:        "Revenue Activity",
  high_spend_low_revenue:    "High Spend",
  heavy_outbound_settlement: "Heavy Outbound",
  recurring_flow_detected:   "Recurring Flows",
  incomplete_wallet_role:    "Roles Unverified",
};

function cardTreasuryScore(agent: Agent): number {
  const map: Record<string, number> = { Healthy: 92, Stable: 78, Watch: 45, "At Risk": 18 };
  return map[agent.treasuryHealth] ?? 0;
}

function cardTransparencyScore(agent: Agent): number {
  let s = 0;
  const wallets = agent.wallets ?? [];
  if (wallets.length > 0) s += 30;
  if (agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed") s += 30;
  else if (agent.verificationStatus === "Claimed")          s += 20;
  else if (agent.verificationStatus === "Wallets Declared") s += 10;
  if ((agent.financialActivityScore ?? 0) > 0) s += 20;
  if (agent.evidenceSources.length > 0) s += 10;
  if (agent.adminNotes) s += 10;
  return Math.min(100, s);
}


function cardVerdictSnippet(agent: Agent): string {
  if (!agent.adminNotes) return `${agent.name} is indexed in the registry. No verdict available yet.`;
  const notes = agent.adminNotes.trim();
  if (notes.length <= 180) return notes;
  const cut = notes.slice(0, 180);
  const lastDot = cut.lastIndexOf(".");
  return lastDot > 80 ? cut.slice(0, lastDot + 1) : cut + "…";
}

function cardStatusLabel(agent: Agent): string {
  const map: Record<string, string> = {
    "Verified": "Verified", "Luca Managed": "Luca Managed",
    "Claimed": "Claimed by Team", "Wallets Declared": "Wallets Declared",
    "Needs Verification": "Needs Verification", "Candidate": "Candidate",
  };
  return map[agent.verificationStatus] ?? agent.verificationStatus;
}

function cardStatusColor(agent: Agent): string {
  const s = agent.verificationStatus;
  if (s === "Verified" || s === "Luca Managed" || s === "Claimed") return "#6DB874";
  if (s === "Wallets Declared") return "#5B8FA8";
  return "#7d828d";
}

// ── Share card modal ──────────────────────────────────────────────────────────

function ShareCardModal({ agent, slug, classification, onClose }: {
  agent: Agent;
  slug: string;
  classification?: SettlementClassification;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const treasuryScore   = cardTreasuryScore(agent);
  const transpScore     = cardTransparencyScore(agent);
  const verdict         = cardVerdictSnippet(agent);
  const vstatus         = cardStatusLabel(agent);

  const healthColor =
    agent.treasuryHealth === "Healthy" || agent.treasuryHealth === "Stable" ? "#2d6e35"
    : agent.treasuryHealth === "Watch"   ? "#a06020"
    : agent.treasuryHealth === "At Risk" ? "#a03030" : "#888";

  const verifyColor =
    agent.verificationStatus === "Verified" || agent.verificationStatus === "Luca Managed" || agent.verificationStatus === "Claimed"
      ? "#2d6e35"
      : agent.verificationStatus === "Wallets Declared" ? "#376e8a" : "#888";

  const visiblePatterns = (classification?.patterns ?? [])
    .filter((p) => p !== "active_operational" && p !== "dormant" && CARD_PATTERN_LABEL[p])
    .slice(0, 3);

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${slug}-x402books.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }, [slug]);

  const shareToX = useCallback(() => {
    const text = `${agent.name} · Treasury: ${agent.treasuryHealth} · ${vstatus} — tracked by x402Books AI`;
    const url  = `https://www.x402books.xyz/registry/${slug}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [agent.name, agent.treasuryHealth, vstatus, slug]);

  // Prevent scroll-through on the body
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(4px)",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 660, width: "100%" }}>

        {/* ── The card ── */}
        <div
          ref={cardRef}
          style={{
            position: "relative",
            width: "100%", maxWidth: 620,
            background: "#f0ece0",
            borderRadius: 20,
            overflow: "hidden",
            padding: "32px 36px 26px",
            boxShadow: "0 2px 40px rgba(0,0,0,0.12)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Ghost watermark */}
          <div style={{
            position: "absolute", right: -10, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 180, fontWeight: 800,
            color: "rgba(80,70,50,0.045)",
            letterSpacing: "-0.05em",
            lineHeight: 1,
            pointerEvents: "none",
            userSelect: "none",
          }}>x402</div>

          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "#3b7a45", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: "#f0ece0" }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3b5e43", letterSpacing: "0.01em" }}>x402Books AI</span>
          </div>

          {/* Headline */}
          <p style={{ fontSize: "1.35rem", fontWeight: 300, color: "#7a7364", marginBottom: 8, lineHeight: 1.2 }}>
            <strong style={{ fontWeight: 600, color: "#3c3830" }}>{agent.name}</strong> is tracked by x402Books
          </p>

          {/* Hero stat */}
          <p style={{ fontSize: "3.2rem", fontWeight: 700, color: healthColor, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
            {agent.treasuryHealth === "Pending" ? "—" : agent.treasuryHealth}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#9a9180", marginBottom: 22 }}>
            Treasury Health · Score {agent.treasuryHealth === "Pending" ? "—" : `${treasuryScore}/100`}
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(80,70,50,0.12)", marginBottom: 20 }} />

          {/* Stats columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 600, color: "#3c3830", letterSpacing: "-0.02em" }}>
                {agent.financialActivityScore ?? "—"}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#9a9180" }}>Financial Activity</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, borderLeft: "1px solid rgba(80,70,50,0.1)", paddingLeft: 20 }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 600, color: "#3c3830", letterSpacing: "-0.02em" }}>
                {transpScore}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#9a9180" }}>Transparency Score</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, borderLeft: "1px solid rgba(80,70,50,0.1)", paddingLeft: 20 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: verifyColor, marginTop: 4 }}>
                {vstatus}
              </span>
              <span style={{ fontSize: "0.68rem", color: "#9a9180" }}>Verification</span>
            </div>
          </div>

          {/* Verdict */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(80,70,50,0.12)", position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(59,122,69,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
              Luca&apos;s Verdict
            </p>
            <p style={{ fontSize: "0.74rem", color: "#7a7364", lineHeight: 1.6 }}>{verdict}</p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {visiblePatterns.map((p) => (
                <span key={p} style={{
                  fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px",
                  borderRadius: 99, background: "rgba(80,70,50,0.07)",
                  color: "#7a7364", border: "1px solid rgba(80,70,50,0.12)",
                }}>
                  {CARD_PATTERN_LABEL[p] ?? p}
                </span>
              ))}
            </div>
            <span style={{ fontSize: "0.66rem", color: "#b0a990" }}>
              x402books.xyz/registry/{slug}
            </span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 420 }}>
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(109,184,116,0.3)",
              background: "rgba(109,184,116,0.1)", color: "#6DB874",
              fontSize: "0.82rem", fontWeight: 700, cursor: downloading ? "not-allowed" : "pointer",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            {downloading ? "Saving…" : "Download PNG"}
          </button>
          <button
            type="button"
            onClick={shareToX}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 16px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "#eae8e3",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)", color: "rgba(234,232,227,0.4)",
              fontSize: "0.82rem", cursor: "pointer",
            }}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>
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

// ── Inference Activity block (any agent with data) ───────────────────────────

function InferenceActivityBlock({ ia }: { ia: InferenceSummary }) {
  const usd = (n: number) => n === 0 ? "$0.00" : n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(2)}`;

  return (
    <section className="prof-section">
      <p className="prof-section-title">
        Inference Activity · Last 30d
        {ia.agentId === "luca" && (
          <a href="/luca/ledger" style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--accent)", textDecoration: "none" }}>
            Full ledger →
          </a>
        )}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>30d Spend</span>
          <span style={{ fontFamily: "monospace", color: "#f87171" }}>-{usd(ia.totalCostUsd)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Requests</span>
          <span style={{ fontFamily: "monospace" }}>{ia.requestCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Primary Provider</span>
          <span style={{ color: "var(--ink)", textTransform: "capitalize" }}>{ia.primaryProvider ?? "—"}</span>
        </div>
        {ia.providerBreakdown.length > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>Providers Used</span>
            <span style={{ color: "var(--ink)" }}>{ia.providersUsed.join(", ")}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--muted)" }}>Avg Cost / Request</span>
          <span style={{ fontFamily: "monospace" }}>{usd(ia.avgCostPerRequest)}</span>
        </div>
      </div>
    </section>
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

// ── Tool Decisions block (Nipmod integration) ────────────────────────────────

const RISK_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  low:     { color: "var(--accent)", bg: "rgba(109,184,116,0.08)", border: "rgba(109,184,116,0.18)" },
  medium:  { color: "#f59e0b",       bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.18)"  },
  high:    { color: "#f87171",       bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.18)" },
  unknown: { color: "var(--muted)",  bg: "rgba(125,130,141,0.06)", border: "rgba(125,130,141,0.14)" },
};

const DECISION_ICON: Record<string, string> = {
  install: "check_circle",
  reject:  "cancel",
  defer:   "schedule",
  unknown: "help",
};

function ToolDecisionsBlock({ events }: { events: ToolDecisionEvent[] }) {
  if (events.length === 0) return null;

  const installs = events.filter((e) => e.decision === "install").length;
  const rejects  = events.filter((e) => e.decision === "reject").length;
  const highRisk = events.filter((e) => e.risk_level === "high").length;

  return (
    <section className="prof-section">
      <p className="prof-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        Tool Decisions
        <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "var(--muted)", background: "var(--surface-soft)", padding: "1px 6px", borderRadius: 99, border: "1px solid var(--line)" }}>
          via Nipmod
        </span>
      </p>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { label: "Installed", value: installs, color: "var(--accent)" },
          { label: "Rejected",  value: rejects,  color: "#f87171" },
          { label: "High Risk", value: highRisk,  color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.slice(0, 6).map((e) => {
          const rs = RISK_STYLE[e.risk_level] ?? RISK_STYLE.unknown;
          return (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 8,
              background: "var(--surface-soft)", border: "1px solid var(--line)",
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 14,
                color: e.decision === "install" ? "var(--accent)" : e.decision === "reject" ? "#f87171" : "var(--muted)",
                flexShrink: 0,
              }}>
                {DECISION_ICON[e.decision] ?? "help"}
              </span>
              <span style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.package}
              </span>
              {e.source && (
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0 }}>{e.source}</span>
              )}
              <span style={{
                fontSize: "0.64rem", fontWeight: 600, padding: "2px 6px", borderRadius: 99,
                color: rs.color, background: rs.bg, border: `1px solid ${rs.border}`,
                flexShrink: 0, textTransform: "capitalize",
              }}>
                {e.risk_level}
              </span>
              {e.trust_score !== null && (
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", flexShrink: 0 }}>
                  {e.trust_score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Claim banner (top of body, unclaimed profiles only) ──────────────────────

type ClaimTab = "wallet" | "manifest";
type ClaimState = "idle" | "loading" | "done" | "error";

function ClaimBanner({ slug, agentName, status }: { slug: string; agentName: string; status: string }) {
  const [expanded, setExpanded]       = useState(false);
  const [tab, setTab]                 = useState<ClaimTab>("wallet");

  // wallet tab state
  const [wallet, setWallet]           = useState("");
  const [walletState, setWalletState] = useState<ClaimState>("idle");
  const [walletMatched, setWalletMatched] = useState(false);
  const [walletMsg, setWalletMsg]     = useState("");

  // manifest tab state
  const [repoUrl, setRepoUrl]         = useState("");
  const [mfState, setMfState]         = useState<ClaimState>("idle");
  const [mfMsg, setMfMsg]             = useState("");

  if (status === "Verified" || status === "Luca Managed" || status === "Claimed") return null;

  const done = (tab === "wallet" && walletState === "done") || (tab === "manifest" && mfState === "done");

  async function submitWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    setWalletState("loading");
    try {
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: slug, wallet_address: wallet.trim() }),
      });
      const d = await res.json() as { ok: boolean; matched?: boolean; message?: string; error?: string };
      if (d.ok) {
        setWalletState("done");
        setWalletMatched(d.matched ?? false);
        setWalletMsg(d.message ?? "Claim submitted.");
      } else {
        setWalletState("error");
        setWalletMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setWalletState("error");
      setWalletMsg("Network error. Please try again.");
    }
  }

  async function submitManifest(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setMfState("loading");
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const d = await res.json() as { ok: boolean; message?: string; error?: string };
      if (d.ok) {
        setMfState("done");
        setMfMsg(d.message ?? "Manifest submitted for verification.");
      } else {
        setMfState("error");
        setMfMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setMfState("error");
      setMfMsg("Network error. Please try again.");
    }
  }

  const bannerStyle: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid rgba(109,184,116,0.22)",
    borderLeft: "3px solid var(--accent)",
    background: "var(--accent-soft)",
    padding: expanded ? "16px 18px" : "13px 18px",
    marginBottom: 20,
    transition: "padding 0.15s",
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (done) {
    const isMatch = tab === "wallet" && walletMatched;
    const doneMsg = tab === "wallet" ? walletMsg : mfMsg;
    const title   = tab === "manifest"
      ? "Manifest queued for verification"
      : isMatch ? "Wallet matched — claim under review" : "Claim submitted for review";
    const color   = (tab === "manifest" || isMatch) ? "var(--accent)" : "#f59e0b";
    const icon    = (tab === "manifest" || isMatch) ? "check_circle" : "info";
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color, marginTop: 1, flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ fontSize: "0.84rem", fontWeight: 700, color, marginBottom: 3 }}>{title}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{doneMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--accent)", flexShrink: 0 }}>handshake</span>
            <p style={{ fontSize: "0.82rem", color: "var(--ink)", fontWeight: 500, margin: 0 }}>
              Is this your agent?{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                Claim <strong style={{ color: "var(--ink)" }}>{agentName}</strong> to verify ownership.
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setTab("manifest"); setExpanded(true); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(59,130,246,0.4)",
                background: "rgba(59,130,246,0.08)", color: "#3b82f6",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Submit manifest
            </button>
            <button
              type="button"
              onClick={() => { setTab("wallet"); setExpanded(true); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(109,184,116,0.35)",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Claim with wallet →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  return (
    <div style={bannerStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--accent)" }}>handshake</span>
        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Claim {agentName}</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem" }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, border: "1px solid var(--line)", overflow: "hidden", width: "fit-content" }}>
        {(["manifest", "wallet"] as ClaimTab[]).map((t) => {
          const labels: Record<ClaimTab, string> = { wallet: "Claim with wallet", manifest: "Submit manifest" };
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "6px 14px",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                border: "none", cursor: "pointer",
                fontSize: "0.78rem", fontWeight: active ? 700 : 400,
                transition: "background 0.12s",
              }}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Wallet tab */}
      {tab === "wallet" && (
        <>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.55 }}>
            Enter a wallet address associated with this agent. A match against declared wallets fast-tracks verification.
          </p>
          <form onSubmit={submitWallet} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="0x… your wallet address"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              pattern="^0x[0-9a-fA-F]{40}$"
              required
              autoFocus
              style={{
                flex: 1, minWidth: 200,
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)", fontSize: "0.82rem",
                fontFamily: "monospace", outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={walletState === "loading"}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "var(--accent)", color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: walletState === "loading" ? "not-allowed" : "pointer",
                opacity: walletState === "loading" ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {walletState === "loading" ? "Checking…" : "Submit Claim →"}
            </button>
            {walletState === "error" && (
              <p style={{ width: "100%", fontSize: "0.78rem", color: "#f87171", margin: "4px 0 0" }}>{walletMsg}</p>
            )}
          </form>
        </>
      )}

      {/* Manifest tab */}
      {tab === "manifest" && (
        <>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.55 }}>
            Add a <code style={{ fontFamily: "monospace", background: "var(--line)", padding: "1px 4px", borderRadius: 3 }}>.x402books/wallets.json</code> file
            to your agent&apos;s GitHub or Gitlawb repo, then paste the repo URL below.
            This is the fastest path to <strong style={{ color: "var(--ink)" }}>Wallets Declared</strong> status.
          </p>
          <form onSubmit={submitManifest} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="url"
              placeholder="https://github.com/your-org/your-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              autoFocus={tab === "manifest"}
              style={{
                flex: 1, minWidth: 220,
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)", fontSize: "0.82rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={mfState === "loading"}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "#3b82f6", color: "#fff",
                fontSize: "0.82rem", fontWeight: 700,
                cursor: mfState === "loading" ? "not-allowed" : "pointer",
                opacity: mfState === "loading" ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {mfState === "loading" ? "Fetching…" : "Submit Manifest →"}
            </button>
            {mfState === "error" && (
              <p style={{ width: "100%", fontSize: "0.78rem", color: "#f87171", margin: "4px 0 0" }}>{mfMsg}</p>
            )}
          </form>
        </>
      )}
    </div>
  );
}

// ── Main profile ──────────────────────────────────────────────────────────────

export function ProfileClient({ agent, slug, economics, inferenceActivity, classification, toolDecisions, books }: { agent: Agent; slug: string; economics?: AgentEconomicSummary; inferenceActivity?: InferenceSummary; classification?: SettlementClassification; toolDecisions?: ToolDecisionEvent[]; books?: AgentBooks | AgentBooksUnattributed }) {
  const [showShare, setShowShare] = useState(false);
  const transparencyScore = cardTransparencyScore(agent);
  const tsColor = transparencyScore >= 70 ? "var(--accent)" : transparencyScore >= 40 ? "var(--blue)" : "var(--muted)";
  const tsBg    = transparencyScore >= 70 ? "var(--accent-soft)" : transparencyScore >= 40 ? "rgba(91,143,168,0.08)" : "rgba(125,130,141,0.06)";

  return (
    <div className="prof-page">
      {/* Header */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/registry" style={{ color: "var(--accent)" }}>Registry</Link>
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
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "10px 16px", borderRadius: 10,
              background: tsBg,
              border: `1px solid ${tsColor}22`,
              gap: 2, marginBottom: 8,
            }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: tsColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {transparencyScore}
              </span>
              <span style={{ fontSize: "0.62rem", color: "var(--muted)", fontWeight: 500, textAlign: "center", whiteSpace: "nowrap" }}>
                Transparency Score
              </span>
            </div>
            <button type="button" className="prof-share-btn" onClick={() => setShowShare(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>share</span>
              Share
            </button>
          </div>
        </div>

        <div className="prof-body">
          {/* Claim banner — top of body, unclaimed agents only */}
          <ClaimBanner slug={slug} agentName={agent.name} status={agent.verificationStatus} />

          {/* Agent Books — the headline financial statement */}
          {books && <AgentBooksBlock books={books} />}

          {/* Luca's Notes — research and analysis by Luca */}
          {agent.adminNotes && (
            <div className="prof-verdict">
              <div className="prof-verdict-label">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                Luca&apos;s Notes
              </div>
              <p className="prof-verdict-text">{agent.adminNotes}</p>
              {agent.lastChecked && (
                <p className="prof-verdict-date">Last reviewed: {agent.lastChecked}</p>
              )}
            </div>
          )}

          <div className="prof-grid">
            {/* Wallets — attribution first */}
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
              {Array.from(new Map((agent.wallets ?? []).map((w) => [w.address.toLowerCase(), w])).values()).map((w) => (
                <div key={w.address} className="reg-card-wallet-row">
                  <span className={`reg-wallet-label-pill reg-wallet-${w.label.replace(/\s+/g, "-")}`}>
                    {w.label}
                  </span>
                  {w.chain && (
                    <span className="reg-wallet-chain">{w.chain}</span>
                  )}
                  {w.confidence && w.confidence !== "declared" && (
                    <span className="reg-wallet-confidence">{w.confidence}</span>
                  )}
                  <a href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noreferrer" className="reg-mono reg-wallet-addr">
                    {truncate(w.address)}
                  </a>
                  {w.notes && <span className="reg-wallet-note">{w.notes}</span>}
                </div>
              ))}
              {!agent.tokenAddress && (agent.wallets ?? []).length === 0 && (
                <p className="reg-card-no-wallet">Wallet discovery pending — Luca is researching public data.</p>
              )}
            </section>

            {/* Settlement profile */}
            {classification && <SettlementSection classification={classification} />}

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

            {/* Inference Activity (any agent with data) */}
            {inferenceActivity && <InferenceActivityBlock ia={inferenceActivity} />}

            {/* Agent Economics (Luca self-profile only) */}
            {economics && <AgentEconomicsBlock economics={economics} />}

            {/* Tool Decisions (Nipmod integration) */}
            {toolDecisions && toolDecisions.length > 0 && <ToolDecisionsBlock events={toolDecisions} />}

            {/* Report CTA */}
            {(agent.tokenAddress || (agent.wallets ?? []).length > 0) && (
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

      {showShare && (
        <ShareCardModal
          agent={agent}
          slug={slug}
          classification={classification}
          onClose={() => setShowShare(false)}
        />
      )}

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
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 x402Books AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
