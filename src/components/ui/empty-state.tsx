import type { ReactNode, CSSProperties } from "react";

// ── EmptyState ────────────────────────────────────────────────────────────────

type EmptyVariant =
  | "no-manifest"
  | "no-inference"
  | "no-books"
  | "no-history"
  | "no-revenue"
  | "no-data"
  | "claim"
  | "custom";

const VARIANT_CONFIG: Record<EmptyVariant, { icon: string; title: string; body: string }> = {
  "no-manifest": {
    icon: "◻",
    title: "No wallet manifest",
    body: "This agent hasn't declared a .agent/wallets.json. Financial books require an attributed wallet manifest.",
  },
  "no-inference": {
    icon: "⊘",
    title: "No inference activity",
    body: "No inference events logged yet. Route inference through Zetta or connect via the Surplus webhook to start tracking.",
  },
  "no-books": {
    icon: "≡",
    title: "Books not available",
    body: "Full financial books require a declared wallet manifest with at least one attributed wallet.",
  },
  "no-history": {
    icon: "◷",
    title: "No transaction history",
    body: "No on-chain activity found for the declared wallets in the selected period.",
  },
  "no-revenue": {
    icon: "∅",
    title: "No revenue classified",
    body: "No operating revenue detected in the selected period. Ensure wallets are correctly attributed.",
  },
  "no-data": {
    icon: "—",
    title: "No data available",
    body: "Data for this section is not available yet.",
  },
  claim: {
    icon: "⊕",
    title: "Claim this profile",
    body: "Is this your agent? Submit a wallet manifest to enable full financial attribution and books.",
  },
  custom: {
    icon: "—",
    title: "",
    body: "",
  },
};

export function EmptyState({
  variant = "no-data",
  title,
  body,
  action,
  style,
}: {
  variant?: EmptyVariant;
  title?: string;
  body?: string;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  const cfg = VARIANT_CONFIG[variant];
  const displayTitle = title ?? cfg.title;
  const displayBody = body ?? cfg.body;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "36px 24px",
      border: "1px dashed var(--line)", borderRadius: 10,
      textAlign: "center",
      ...style,
    }}>
      <span style={{
        fontSize: "1.5rem", color: "var(--muted)", marginBottom: 12,
        fontFamily: "var(--font-mono)", lineHeight: 1,
      }}>
        {cfg.icon}
      </span>
      {displayTitle && (
        <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
          {displayTitle}
        </p>
      )}
      {displayBody && (
        <p style={{
          fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6,
          maxWidth: 380, margin: action ? "0 0 16px" : 0,
        }}>
          {displayBody}
        </p>
      )}
      {action}
    </div>
  );
}

// ── LoadingState ──────────────────────────────────────────────────────────────

export function SkeletonRow({ style }: { style?: CSSProperties }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "10px 14px",
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 6, ...style,
    }}>
      <div style={{ height: 14, flex: 1, background: "var(--line)", borderRadius: 4, animation: "tl-pulse 1.4s ease infinite" }} />
      <div style={{ height: 14, width: 80, background: "var(--line)", borderRadius: 4, animation: "tl-pulse 1.4s ease infinite 0.2s" }} />
    </div>
  );
}

export function LoadingState({ rows = 4, style }: { rows?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, ...style }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────

export function ErrorState({
  message = "Could not load this section.",
  onRetry,
  style,
}: {
  message?: string;
  onRetry?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      padding: "14px 16px",
      borderLeft: "3px solid var(--red)",
      background: "rgba(244,96,96,.06)",
      borderRadius: "0 6px 6px 0",
      ...style,
    }}>
      <p style={{ fontSize: "0.82rem", color: "var(--ink)", margin: onRetry ? "0 0 8px" : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)",
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── CostStatusBanner ──────────────────────────────────────────────────────────

export function CostStatusBanner({
  status,
  requestCount,
}: {
  status: "actual" | "estimated" | "missing";
  requestCount: number;
}) {
  if (requestCount === 0) return null;

  const cfg = {
    actual: {
      bg: "rgba(74,232,160,.08)",
      border: "rgba(74,232,160,.25)",
      dot: "#4AE8A0",
      label: "Cost data: actual",
      note: "Cost figures sourced from provider billing.",
    },
    estimated: {
      bg: "rgba(244,185,66,.08)",
      border: "rgba(244,185,66,.25)",
      dot: "#F4B942",
      label: "Cost data: estimated",
      note: "Spend estimated from model pricing × token counts. Actual billing may differ.",
    },
    missing: {
      bg: "rgba(244,96,96,.08)",
      border: "rgba(244,96,96,.25)",
      dot: "#F46060",
      label: "Cost data: missing",
      note: "No cost metadata available. Inference activity is tracked but costs cannot be calculated.",
    },
  }[status];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px", borderRadius: 8, marginBottom: 16,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: cfg.dot, flexShrink: 0, display: "block",
      }} />
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink)" }}>{cfg.label}</span>
      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>— {cfg.note}</span>
    </div>
  );
}

// ── ClaimBanner ───────────────────────────────────────────────────────────────

export function ClaimBanner({ slug }: { slug: string }) {
  return (
    <div style={{
      padding: "11px 16px", borderRadius: 8, marginBottom: 20,
      background: "rgba(244,185,66,.08)", border: "1px solid rgba(244,185,66,.25)",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <p style={{ fontSize: "0.82rem", color: "var(--ink)", margin: 0 }}>
        This agent hasn&apos;t declared a wallet manifest. Are you the operator?
      </p>
      <a href="/register" style={{
        fontSize: "0.78rem", fontWeight: 700, color: "#F4B942",
        border: "1px solid rgba(244,185,66,.40)", borderRadius: 6,
        padding: "5px 12px", whiteSpace: "nowrap",
      }}>
        Submit manifest →
      </a>
    </div>
  );
}
