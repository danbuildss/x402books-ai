"use client";
import { useState, useCallback, useRef, useEffect, type CSSProperties, type ReactNode } from "react";

// ── FilterChip ────────────────────────────────────────────────────────────────

export function FilterChip({
  active,
  onClick,
  children,
  style,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: "0.75rem", fontWeight: 600, padding: "5px 12px",
        borderRadius: 99, border: "1px solid",
        borderColor: active ? "var(--accent)" : "var(--line)",
        background: active ? "rgba(74,232,160,.12)" : "var(--surface)",
        color: active ? "var(--accent)" : "var(--muted)",
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

export function FilterBar({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounce = 200,
  style,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  debounce?: number;
  style?: CSSProperties;
}) {
  const [local, setLocal] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value ?? ""); }, [value]);

  const handle = useCallback((v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), debounce);
  }, [onChange, debounce]);

  return (
    <div style={{ position: "relative", ...style }}>
      <span style={{
        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
        color: "var(--muted)", fontSize: "0.82rem", pointerEvents: "none",
        fontFamily: "var(--font-mono)",
      }}>
        ⌕
      </span>
      <input
        type="text"
        value={local}
        onChange={e => handle(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "7px 10px 7px 28px",
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 8, color: "var(--ink)", fontSize: "0.82rem",
          outline: "none", fontFamily: "var(--font-sans)",
        }}
      />
    </div>
  );
}

// ── DateRangeSelector ─────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
] as const;

export type DatePeriod = typeof PERIODS[number]["value"];

export function DateRangeSelector({
  value,
  onChange,
  style,
}: {
  value: DatePeriod;
  onChange: (v: DatePeriod) => void;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", gap: 0,
      border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden",
      ...style,
    }}>
      {PERIODS.map((p, i) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            fontSize: "0.75rem", fontWeight: 600, padding: "5px 12px",
            border: "none",
            borderLeft: i > 0 ? "1px solid var(--line)" : "none",
            background: value === p.value ? "rgba(74,232,160,.12)" : "var(--surface)",
            color: value === p.value ? "var(--accent)" : "var(--muted)",
            cursor: "pointer", transition: "all 0.12s",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── EcosystemFilter ───────────────────────────────────────────────────────────

export function EcosystemFilter({
  ecosystems,
  selected,
  onToggle,
  style,
}: {
  ecosystems: string[];
  selected: Set<string>;
  onToggle: (eco: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", ...style }}>
      {ecosystems.map(eco => (
        <FilterChip key={eco} active={selected.has(eco)} onClick={() => onToggle(eco)}>
          {eco}
        </FilterChip>
      ))}
    </div>
  );
}
