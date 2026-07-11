"use client";

import { useEffect, useState } from "react";
import { TIER_LABELS, TIER_LIMITS, TIER_THRESHOLDS, type LucaTier } from "@/lib/luca-token";

const TIER_COLORS: Record<LucaTier, string> = {
  free: "var(--muted)", holder: "#5B9EF4", whale: "var(--accent)", luca: "#8B7CF6",
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

      {/* Current plan */}
      <div className="op-card">
        <div className="op-card-head">
          <h2 className="op-card-title">Current Plan</h2>
          <span className="op-badge" style={{ background: `color-mix(in srgb, ${TIER_COLORS[tier]} 14%, transparent)`, color: TIER_COLORS[tier], fontSize: "0.75rem", padding: "3px 10px" }}>
            {TIER_LABELS[tier]}
          </span>
        </div>
        <div className="op-stat-grid">
          <div className="op-stat">
            <p className="op-stat-label">Daily Limit</p>
            <p className="op-stat-value" style={{ color: TIER_COLORS[tier] }}>{TIER_LIMITS[tier].toLocaleString()}</p>
            <p className="op-stat-sub">requests / day</p>
          </div>
          <div className="op-stat">
            <p className="op-stat-label">Access Model</p>
            <p className="op-stat-value" style={{ fontSize: "0.9rem" }}>Token-gated</p>
            <p className="op-stat-sub">hold $LUCA to unlock</p>
          </div>
          <div className="op-stat">
            <p className="op-stat-label">Linked Wallet</p>
            <p className="op-stat-value" style={{ fontSize: "0.82rem" }}>
              {loading ? "…" : wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—"}
            </p>
            <p className="op-stat-sub">{wallet ? "verified" : "not linked"}</p>
          </div>
        </div>
      </div>

      {/* Tier comparison */}
      <div className="op-card">
        <h2 className="op-card-title" style={{ marginBottom: 16 }}>Plans</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {(["free", "holder", "whale"] as LucaTier[]).map((t) => (
            <div key={t} style={{
              padding: 16, borderRadius: 8,
              border: `1px solid ${t === tier ? TIER_COLORS[t] : "var(--line)"}`,
              background: t === tier ? `color-mix(in srgb, ${TIER_COLORS[t]} 6%, var(--surface))` : "var(--surface-soft)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: "0.84rem", color: TIER_COLORS[t] }}>{TIER_LABELS[t]}</span>
                {t === tier && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: TIER_COLORS[t], textTransform: "uppercase" }}>Current</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
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
      </div>
    </div>
  );
}
