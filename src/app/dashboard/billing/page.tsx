"use client";

import { useEffect, useState } from "react";
import { TIER_LABELS, TIER_LIMITS, TIER_THRESHOLDS, type LucaTier } from "@/lib/luca-token";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { LedgerCard, LedgerRow } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

const TIER_COLORS: Record<LucaTier, string> = {
  free: "var(--muted)", holder: "#5B9EF4", whale: "var(--accent)", luca: "#8B7CF6",
};

const TIER_BADGE_VARIANT: Record<LucaTier, "neutral" | "blue" | "green" | "purple"> = {
  free: "neutral", holder: "blue", whale: "green", luca: "purple",
};

const TIER_FEATURES: Record<LucaTier, string[]> = {
  free: ["100 API requests/day", "Access to agent books", "Ledger summary + transactions", "Public registry read"],
  holder: ["500 API requests/day", "All Free features", "Full report endpoint", "AI categorization"],
  whale: ["2,000 API requests/day", "All Developer features", "Agent financial state", "Priority support"],
  luca: ["2,000 API requests/day", "Dedicated Luca allocation", "All endpoints", "Internal access"],
};

export default function BillingPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [tier] = useState<LucaTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/user/wallet");
        const data = await res.json() as { wallet: string | null };
        setWallet(data.wallet);
      } catch { /* unavailable */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Billing</h1>
        <p className="op-page-sub">Your current plan, usage limits, and upgrade path.</p>
      </div>

      {/* Current plan stats */}
      <MetricGrid cols={3} style={{ marginBottom: 24 }}>
        <MetricCard
          label="Daily Limit"
          value={TIER_LIMITS[tier].toLocaleString()}
          sub="requests / day"
          valueColor={TIER_COLORS[tier]}
        />
        <MetricCard
          label="Access Model"
          value="Token-gated"
          sub="hold $LUCA to unlock"
        />
        <MetricCard
          label="Linked Wallet"
          value={loading ? "…" : wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—"}
          sub={wallet ? "verified" : "not linked"}
          valueColor={wallet ? "var(--accent)" : undefined}
        />
      </MetricGrid>

      {/* Current plan */}
      <LedgerCard
        eyebrow="Subscription"
        title="Current Plan"
        action={<StatusBadge variant={TIER_BADGE_VARIANT[tier]}>{TIER_LABELS[tier]}</StatusBadge>}
      >
        <LedgerRow
          first
          label="Plan"
          value={TIER_LABELS[tier]}
          valueStyle={{ color: TIER_COLORS[tier] }}
        />
        <LedgerRow
          label="Daily request limit"
          value={TIER_LIMITS[tier].toLocaleString()}
        />
        <LedgerRow
          label="Access model"
          value="Token-gated ($LUCA balance)"
          valueStyle={{ color: "var(--muted)", fontFamily: "inherit" }}
        />
        <LedgerRow
          last
          label="Wallet"
          value={loading ? "…" : wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Not linked"}
          valueStyle={{ color: wallet ? "var(--ink)" : "var(--muted)" }}
        />
      </LedgerCard>

      {/* Tier comparison */}
      <LedgerCard eyebrow="Plans" title="Available Tiers">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {(["free", "holder", "whale"] as LucaTier[]).map((t) => (
            <div key={t} style={{
              padding: 16, borderRadius: 8,
              border: `1px solid ${t === tier ? TIER_COLORS[t] : "var(--line)"}`,
              background: t === tier ? `color-mix(in srgb, ${TIER_COLORS[t]} 6%, var(--surface))` : "var(--surface-soft)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <StatusBadge variant={TIER_BADGE_VARIANT[t]}>{TIER_LABELS[t]}</StatusBadge>
                {t === tier && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: TIER_COLORS[t], textTransform: "uppercase" }}>Current</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                {TIER_LIMITS[t].toLocaleString()} <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--muted)" }}>req/day</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12 }}>
                {t === "free" && "No $LUCA required"}
                {t === "holder" && `Hold ≥${TIER_THRESHOLDS.holder.toLocaleString()} $LUCA`}
                {t === "whale" && `Hold ≥${TIER_THRESHOLDS.whale.toLocaleString()} $LUCA`}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {TIER_FEATURES[t].map((f) => (
                  <li key={f} style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "var(--surface-soft)", borderRadius: 8, fontSize: "0.78rem", color: "var(--muted)" }}>
          Tier is determined automatically by your $LUCA balance on Base. Link your wallet in{" "}
          <a href="/dashboard/keys" style={{ color: "var(--accent)" }}>API Keys</a> to verify your balance and unlock your tier.
          $LUCA contract: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3</code>
        </div>
      </LedgerCard>
    </div>
  );
}
