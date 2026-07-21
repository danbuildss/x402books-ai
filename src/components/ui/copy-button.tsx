"use client";
import { useState, type CSSProperties } from "react";

export function CopyButton({
  value,
  label,
  style,
}: {
  value: string;
  label?: string;
  style?: CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <button
      onClick={copy}
      title={label ?? "Copy"}
      style={{
        fontSize: "0.72rem", fontWeight: 600, padding: "3px 8px",
        border: "1px solid var(--line)",
        borderColor: copied ? "rgba(74,232,160,.40)" : "var(--line)",
        borderRadius: 6,
        background: copied ? "rgba(74,232,160,.10)" : "var(--surface)",
        color: copied ? "var(--accent)" : "var(--muted)",
        cursor: "pointer", transition: "all 0.15s",
        fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
        ...style,
      }}
    >
      {copied ? "✓ copied" : (label ?? "copy")}
    </button>
  );
}

// ── TruncatedAddress ──────────────────────────────────────────────────────────

export function TruncatedAddress({
  address,
  chars = 6,
  copyable = true,
  style,
}: {
  address: string;
  chars?: number;
  copyable?: boolean;
  style?: CSSProperties;
}) {
  const truncated = address.length > chars * 2 + 2
    ? `${address.slice(0, chars)}…${address.slice(-chars)}`
    : address;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "0.82rem",
        color: "var(--ink)", fontVariantNumeric: "tabular-nums",
        ...style,
      }}>
        {truncated}
      </span>
      {copyable && <CopyButton value={address} />}
    </span>
  );
}
