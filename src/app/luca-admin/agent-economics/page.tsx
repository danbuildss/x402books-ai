"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Period = "7d" | "30d";

interface EconomicsSummary {
  agentId: string;
  agentName: string | null;
  periodDays: number;
  totalInferenceSpend: number;
  totalInferenceRevenue: number;
  providerSpend: number;
  fallbackProviderSpend: number;
  apiCosts: number;
  walletInflows: number;
  walletOutflows: number;
  netAgentPosition: number;
  topProvider: string | null;
  fallbackUsageCount: number;
  eventCount: number;
  lucaVerdict: string;
}

interface EconomicsResponse {
  period: string;
  periodDays: number;
  summary: EconomicsSummary;
  report: { summary: string; netPositionLabel: string };
}

const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;
const sign = (n: number) => (n >= 0 ? "+" : "-");

function Row({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "green" | "red" | "blue" }) {
  const color = highlight === "green" ? "#4AE8A0" : highlight === "red" ? "#F46060" : highlight === "blue" ? "#5B9EF4" : "#e5e7eb";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #1f2937" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ color, fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 600 }}>{value}</span>
        {sub && <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AgentEconomicsPage() {
  const [period, setPeriod]   = useState<Period>("7d");
  const [data, setData]       = useState<EconomicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/luca/economics?period=${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json as EconomicsResponse);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const s = data?.summary;
  const netColor = s
    ? s.netAgentPosition > 0.01 ? "green" : s.netAgentPosition < -0.01 ? "red" : undefined
    : undefined;

  return (
    <div style={{ background: "#030712", minHeight: "100vh", color: "#e5e7eb", fontFamily: "monospace" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <Link href="/luca-admin" style={{ color: "var(--muted)", fontSize: "0.8rem", textDecoration: "none" }}>
              ← Luca Admin
            </Link>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0", color: "#f9fafb" }}>
              Agent Economics
            </h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {(["7d", "30d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 4,
                  border: `1px solid ${period === p ? "#5B9EF4" : "#374151"}`,
                  background: period === p ? "#5B9EF4" : "transparent",
                  color: period === p ? "#fff" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => load(period)}
              disabled={loading}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid #374151",
                background: "transparent",
                color: loading ? "#4b5563" : "var(--muted)",
                cursor: loading ? "default" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              {loading ? "…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(244,96,96,0.08)", border: "1px solid rgba(244,96,96,0.30)", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem", color: "#F46060", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading…</div>
        )}

        {s && (
          <>
            {/* Period label */}
            <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
              Luca · Last {s.periodDays} days · {s.eventCount} event{s.eventCount === 1 ? "" : "s"}
              {lastRefresh && ` · refreshed ${lastRefresh.toLocaleTimeString()}`}
            </div>

            {/* Net position banner */}
            <div style={{
              background: s.netAgentPosition > 0.01 ? "rgba(74,232,160,0.08)" : s.netAgentPosition < -0.01 ? "rgba(244,96,96,0.08)" : "#111827",
              border: `1px solid ${s.netAgentPosition > 0.01 ? "#166534" : s.netAgentPosition < -0.01 ? "rgba(244,96,96,0.30)" : "#1f2937"}`,
              borderRadius: 8,
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Net Agent Position</span>
              <span style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: s.netAgentPosition > 0.01 ? "#4ade80" : s.netAgentPosition < -0.01 ? "#F46060" : "#e5e7eb",
              }}>
                {sign(s.netAgentPosition)}{usd(s.netAgentPosition)}
              </span>
            </div>

            {/* Rows */}
            <div style={{ marginBottom: "1.5rem" }}>
              <Row label="Inference Spend"    value={`-${usd(s.totalInferenceSpend)}`}   highlight={s.totalInferenceSpend > 0 ? "red" : undefined} />
              <Row label="Inference Revenue"  value={`+${usd(s.totalInferenceRevenue)}`} highlight={s.totalInferenceRevenue > 0 ? "green" : undefined} />
              <Row label="Provider Spend"     value={`-${usd(s.providerSpend)}`}         sub={s.topProvider ? `Top: ${s.topProvider}` : undefined} />
              <Row label="Fallback Usage"     value={`-${usd(s.fallbackProviderSpend)}`} sub={`${s.fallbackUsageCount} call${s.fallbackUsageCount === 1 ? "" : "s"}`} />
              <Row label="API Costs"          value={`-${usd(s.apiCosts)}`} />
              <Row label="Wallet Inflows"     value={`+${usd(s.walletInflows)}`}  highlight={s.walletInflows > 0 ? "green" : undefined} />
              <Row label="Wallet Outflows"    value={`-${usd(s.walletOutflows)}`} />
              <Row label="Events Logged"      value={String(s.eventCount)} highlight="blue" />
            </div>

            {/* Verdict */}
            <div style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderLeft: "3px solid #5B9EF4",
              borderRadius: 6,
              padding: "1rem 1.25rem",
            }}>
              <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>LUCA VERDICT</div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                {s.lucaVerdict}
              </p>
            </div>

            {/* Plain English */}
            {data?.report.summary && (
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "1.25rem", lineHeight: 1.6 }}>
                {data.report.summary}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
