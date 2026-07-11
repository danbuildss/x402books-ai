import type { ReactNode, CSSProperties } from "react";

// ── MetricCard ────────────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  trend,
  trendPositive,
  valueColor,
  style,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  trend?: string;
  trendPositive?: boolean;
  valueColor?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      ...style,
    }}>
      <p style={{
        fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "var(--muted)", margin: "0 0 8px",
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 700,
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        color: valueColor ?? "var(--ink)", margin: 0,
        lineHeight: 1.1,
      }}>
        {value}
      </p>
      {(trend || sub) && (
        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
          {trend && (
            <span style={{
              fontSize: "0.72rem", fontFamily: "var(--font-mono)", fontWeight: 600,
              color: trendPositive === undefined ? "var(--muted)"
                   : trendPositive ? "var(--accent)" : "var(--red)",
            }}>
              {trend}
            </span>
          )}
          {sub && (
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── MetricGrid ────────────────────────────────────────────────────────────────

export function MetricGrid({
  children,
  cols = 4,
  style,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── TrendIndicator ────────────────────────────────────────────────────────────

export function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isPos = value > 0;
  const isNeg = value < 0;
  const color = isPos ? "var(--accent)" : isNeg ? "var(--red)" : "var(--muted)";
  const arrow = isPos ? "▲" : isNeg ? "▼" : "—";
  return (
    <span style={{ color, fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600 }}>
      {arrow} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}
