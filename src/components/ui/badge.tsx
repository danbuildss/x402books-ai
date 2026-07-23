import type { ReactNode, CSSProperties } from "react";

// ── StatusBadge ───────────────────────────────────────────────────────────────

type BadgeVariant =
  | "verified"
  | "luca-managed"
  | "wallets-declared"
  | "erc8004"
  | "claimed"
  | "candidate"
  | "actual"
  | "estimated"
  | "missing"
  | "active"
  | "inactive"
  | "attributed"
  | "unattributed"
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "neutral"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple";

const VARIANT_STYLES: Record<BadgeVariant, CSSProperties> = {
  verified:           { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  "luca-managed":     { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  "wallets-declared": { background: "rgba(91,158,244,.13)", color: "#5B9EF4", borderColor: "rgba(91,158,244,.30)" },
  erc8004:            { background: "rgba(139,124,246,.13)", color: "#8B7CF6", borderColor: "rgba(139,124,246,.30)" },
  claimed:            { background: "rgba(244,185,66,.13)",  color: "#F4B942", borderColor: "rgba(244,185,66,.30)" },
  candidate:          { background: "rgba(80,88,112,.15)",   color: "#505870", borderColor: "rgba(80,88,112,.30)" },
  actual:             { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  estimated:          { background: "rgba(244,185,66,.13)",  color: "#F4B942", borderColor: "rgba(244,185,66,.30)" },
  missing:            { background: "rgba(244,96,96,.13)",   color: "#F46060", borderColor: "rgba(244,96,96,.30)" },
  active:             { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  inactive:           { background: "rgba(80,88,112,.15)",   color: "#505870", borderColor: "rgba(80,88,112,.30)" },
  attributed:         { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  unattributed:       { background: "rgba(80,88,112,.15)",   color: "#505870", borderColor: "rgba(80,88,112,.30)" },
  positive:           { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  negative:           { background: "rgba(244,96,96,.13)",   color: "#F46060", borderColor: "rgba(244,96,96,.30)" },
  warning:            { background: "rgba(244,185,66,.13)",  color: "#F4B942", borderColor: "rgba(244,185,66,.30)" },
  info:               { background: "rgba(91,158,244,.13)", color: "#5B9EF4", borderColor: "rgba(91,158,244,.30)" },
  neutral:            { background: "rgba(80,88,112,.15)",   color: "#505870", borderColor: "rgba(80,88,112,.30)" },
  green:              { background: "rgba(74,232,160,.13)", color: "#4AE8A0", borderColor: "rgba(74,232,160,.30)" },
  amber:              { background: "rgba(244,185,66,.13)",  color: "#F4B942", borderColor: "rgba(244,185,66,.30)" },
  red:                { background: "rgba(244,96,96,.13)",   color: "#F46060", borderColor: "rgba(244,96,96,.30)" },
  blue:               { background: "rgba(91,158,244,.13)", color: "#5B9EF4", borderColor: "rgba(91,158,244,.30)" },
  purple:             { background: "rgba(139,124,246,.13)", color: "#8B7CF6", borderColor: "rgba(139,124,246,.30)" },
};

export function StatusBadge({
  variant,
  children,
  style,
}: {
  variant: BadgeVariant;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: "var(--text-badge)", fontWeight: 700,
      padding: "2px 7px",
      borderRadius: "var(--radius-sm)",
      border: "1px solid",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      ...VARIANT_STYLES[variant],
      ...style,
    }}>
      {children}
    </span>
  );
}

// ── VerificationBadge ─────────────────────────────────────────────────────────

const VERIFICATION_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  "Verified":           { variant: "verified",          label: "Verified ✓" },
  "Luca Managed":       { variant: "luca-managed",      label: "Luca Managed ✓" },
  "Wallets Declared":   { variant: "wallets-declared",  label: "Wallets Declared" },
  "ERC-8004 Indexed":   { variant: "erc8004",           label: "ERC-8004" },
  "Claimed":            { variant: "claimed",            label: "Claimed" },
  "Candidate":          { variant: "candidate",          label: "Candidate" },
};

export function VerificationBadge({ status, style }: { status: string; style?: CSSProperties }) {
  const cfg = VERIFICATION_MAP[status] ?? { variant: "neutral" as BadgeVariant, label: status };
  return <StatusBadge variant={cfg.variant} style={style}>{cfg.label}</StatusBadge>;
}

// ── EcoBadge ──────────────────────────────────────────────────────────────────

const ECO_COLORS: Record<string, string> = {
  BANKR:      "#4AE8A0",
  Virtuals:   "#5B9EF4",
  AEON:       "#8B7CF6",
  EigenCloud: "#F4B942",
  Base:       "#5B9EF4",
};

export function EcoBadge({ ecosystem, style }: { ecosystem: string; style?: CSSProperties }) {
  const c = ECO_COLORS[ecosystem] ?? "#505870";
  return (
    <span style={{
      fontSize: "var(--text-badge)", fontWeight: 700,
      padding: "2px 7px",
      borderRadius: "var(--radius-sm)",
      border: `1px solid ${c}40`,
      background: `${c}18`,
      color: c,
      textTransform: "uppercase", letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {ecosystem}
    </span>
  );
}

// ── CostStatusBadge ───────────────────────────────────────────────────────────

export function CostStatusBadge({ status }: { status: "actual" | "estimated" | "missing" }) {
  const cfg = {
    actual:    { variant: "actual" as BadgeVariant,    label: "Actual" },
    estimated: { variant: "estimated" as BadgeVariant, label: "Estimated" },
    missing:   { variant: "missing" as BadgeVariant,   label: "Missing" },
  }[status];
  return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
}
