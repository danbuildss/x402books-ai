import type { ReactNode, CSSProperties } from "react";

// ── LedgerRow ─────────────────────────────────────────────────────────────────

export function LedgerRow({
  label,
  value,
  detail,
  badge,
  labelStyle,
  valueStyle,
  first,
  last,
  style,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  badge?: ReactNode;
  labelStyle?: CSSProperties;
  valueStyle?: CSSProperties;
  first?: boolean;
  last?: boolean;
  style?: CSSProperties;
}) {
  const radius = "var(--radius-card)";
  const borderRadius = first && last ? radius
    : first ? `${radius} ${radius} 0 0`
    : last  ? `0 0 ${radius} ${radius}`
    : 0;

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius,
      borderBottomWidth: last ? 1 : 0,
      gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--ink)", ...labelStyle }}>
          {label}
        </span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {detail && (
          <span style={{ fontSize: "var(--text-label)", color: "var(--muted)" }}>{detail}</span>
        )}
        <span style={{
          fontSize: "var(--text-data)", fontFamily: "var(--font-mono)", fontWeight: 600,
          fontVariantNumeric: "tabular-nums", color: "var(--ink)",
          ...valueStyle,
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ── LedgerCard ────────────────────────────────────────────────────────────────

export function LedgerCard({
  title,
  eyebrow,
  action,
  children,
  style,
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "var(--space-6)", ...style }}>
      {(title || eyebrow || action) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "var(--space-3)",
        }}>
          <div>
            {eyebrow && (
              <p style={{
                fontSize: "var(--text-eyebrow)", fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.10em", color: "var(--muted)", margin: "0 0 3px",
              }}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {title}
              </h3>
            )}
          </div>
          {action}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{
      fontSize: "var(--text-eyebrow)", fontWeight: 800, textTransform: "uppercase",
      letterSpacing: "0.10em", color: "var(--muted)", margin: "0 0 10px",
      ...style,
    }}>
      {children}
    </p>
  );
}
