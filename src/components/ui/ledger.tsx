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
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 14px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: first && last ? 8 : first ? "8px 8px 0 0" : last ? "0 0 8px 8px" : 0,
      borderBottomWidth: last ? 1 : 0,
      gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", ...labelStyle }}>
          {label}
        </span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {detail && (
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{detail}</span>
        )}
        <span style={{
          fontSize: "0.82rem", fontFamily: "var(--font-mono)", fontWeight: 600,
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
    <div style={{ marginBottom: 24, ...style }}>
      {(title || eyebrow || action) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div>
            {eyebrow && (
              <p style={{
                fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 3px",
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
      fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 10px",
      ...style,
    }}>
      {children}
    </p>
  );
}
