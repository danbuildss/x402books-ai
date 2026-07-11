"use client";
import { type CSSProperties } from "react";

// ── Sparkline ─────────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "var(--accent)",
  fill = true,
  style,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  style?: CSSProperties;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const xs = data.map((_, i) => (i / (data.length - 1)) * width);
  const ys = data.map(v => height - ((v - min) / range) * (height - 4) - 2);

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width} height={height}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden
    >
      {fill && (
        <path d={area} fill={color} opacity={0.12} />
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

// ── MiniAreaChart ─────────────────────────────────────────────────────────────

export function MiniAreaChart({
  data,
  labels,
  width = 300,
  height = 80,
  color = "#4AE8A0",
  style,
}: {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  style?: CSSProperties;
}) {
  if (data.length < 2) return null;
  const pad = { top: 8, right: 4, bottom: labels ? 20 : 4, left: 4 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const xs = data.map((_, i) => pad.left + (i / (data.length - 1)) * iw);
  const ys = data.map(v => pad.top + ih - ((v - min) / range) * ih);

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${pad.top + ih} L${xs[0]},${pad.top + ih} Z`;

  return (
    <svg width={width} height={height} style={{ display: "block", ...style }} aria-hidden>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {labels && labels.map((lbl, i) => (
        i % Math.ceil(labels.length / 4) === 0 && (
          <text
            key={i}
            x={xs[i]}
            y={height - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#505870"
            fontFamily="var(--font-mono)"
          >
            {lbl}
          </text>
        )
      ))}
    </svg>
  );
}

// ── HorizontalBar ─────────────────────────────────────────────────────────────

export function HorizontalBar({
  label,
  value,
  max,
  color = "#4AE8A0",
  formatValue,
  style,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  formatValue?: (v: number) => string;
  style?: CSSProperties;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, ...style }}>
      <span style={{
        fontSize: "0.78rem", color: "var(--muted)", minWidth: 100, flexShrink: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 6, borderRadius: 99,
        background: "var(--line)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: color, width: `${pct}%`,
          transition: "width 0.3s ease",
        }} />
      </div>
      <span style={{
        fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 600,
        color: "var(--ink)", flexShrink: 0, minWidth: 60, textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}>
        {formatValue ? formatValue(value) : value.toLocaleString()}
      </span>
    </div>
  );
}

// ── HorizontalBarList ─────────────────────────────────────────────────────────

export function HorizontalBarList({
  items,
  color,
  formatValue,
  style,
}: {
  items: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
  style?: CSSProperties;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {items.map(item => (
        <HorizontalBar
          key={item.label}
          label={item.label}
          value={item.value}
          max={max}
          color={color}
          formatValue={formatValue}
        />
      ))}
    </div>
  );
}

// ── DonutSegment ──────────────────────────────────────────────────────────────

export function DonutChart({
  segments,
  size = 80,
  thickness = 10,
  style,
}: {
  segments: { value: number; color: string; label?: string }[];
  size?: number;
  thickness?: number;
  style?: CSSProperties;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = -circ / 4; // start at top
  const arcs = segments.map(seg => {
    const dash = (seg.value / total) * circ;
    const arc = { dash, offset, ...seg };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} style={{ display: "block", ...style }} aria-hidden>
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}
