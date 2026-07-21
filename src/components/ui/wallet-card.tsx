import type { CSSProperties } from "react";
import { TruncatedAddress } from "./copy-button";
import { StatusBadge } from "./badge";

// ── WalletRoleBadge ───────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  treasury:   { label: "Treasury",   color: "#4AE8A0" },
  fee:        { label: "Fee",        color: "#5B9EF4" },
  deployer:   { label: "Deployer",   color: "#8B7CF6" },
  operator:   { label: "Operator",   color: "#F4B942" },
  revenue:    { label: "Revenue",    color: "#4AE8A0" },
  spend:      { label: "Spend",      color: "#F46060" },
  inference:  { label: "Inference",  color: "#8B7CF6" },
  settlement: { label: "Settlement", color: "#5B9EF4" },
};

export function WalletRoleBadge({ role, style }: { role: string; style?: CSSProperties }) {
  const cfg = ROLE_CONFIG[role.toLowerCase()] ?? { label: role, color: "#505870" };
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
      border: `1px solid ${cfg.color}40`,
      background: `${cfg.color}18`,
      color: cfg.color,
      textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
      ...style,
    }}>
      {cfg.label}
    </span>
  );
}

// ── WalletCard ────────────────────────────────────────────────────────────────

export function WalletCard({
  address,
  role,
  label,
  chain,
  balance,
  attributed,
  style,
}: {
  address: string;
  role?: string;
  label?: string;
  chain?: string;
  balance?: string;
  attributed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {label && (
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink)" }}>
              {label}
            </span>
          )}
          {role && <WalletRoleBadge role={role} />}
          {chain && (
            <span style={{
              fontSize: "0.65rem", color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}>
              {chain}
            </span>
          )}
        </div>
        <TruncatedAddress address={address} chars={8} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {balance !== undefined && (
          <span style={{
            fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)",
            fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
          }}>
            {balance}
          </span>
        )}
        {attributed !== undefined && (
          <StatusBadge variant={attributed ? "attributed" : "unattributed"}>
            {attributed ? "Attributed" : "Unattributed"}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}

// ── WalletList ────────────────────────────────────────────────────────────────

export function WalletList({
  wallets,
  style,
}: {
  wallets: Array<{
    address: string;
    role?: string;
    label?: string;
    chain?: string;
    balance?: string;
    attributed?: boolean;
  }>;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {wallets.map(w => (
        <WalletCard key={w.address} {...w} />
      ))}
    </div>
  );
}
