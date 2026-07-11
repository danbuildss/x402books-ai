import type { ReactNode, CSSProperties } from "react";

// ── Eyebrow ───────────────────────────────────────────────────────────────────

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{
      fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.12em", color: "var(--accent)", margin: "0 0 6px",
      fontFamily: "var(--font-mono)",
      ...style,
    }}>
      {children}
    </p>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  style,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 20, marginBottom: 28,
      ...style,
    }}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 style={{
          fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)",
          margin: 0, lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: "0.85rem", color: "var(--muted)", margin: "6px 0 0",
            lineHeight: 1.5, maxWidth: 600,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 4 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  action,
  style,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, marginBottom: 14,
      ...style,
    }}>
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "3px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────

export function TabBar({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", gap: 0,
      borderBottom: "1px solid var(--line)", marginBottom: 24,
      ...style,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            fontSize: "0.82rem", fontWeight: 600,
            padding: "10px 16px",
            border: "none", background: "none",
            color: active === tab.key ? "var(--ink)" : "var(--muted)",
            borderBottom: active === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer", transition: "all 0.12s",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px",
              borderRadius: 99,
              background: active === tab.key ? "rgba(74,232,160,.15)" : "var(--surface)",
              color: active === tab.key ? "var(--accent)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
