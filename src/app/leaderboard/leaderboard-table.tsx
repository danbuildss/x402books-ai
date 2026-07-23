"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LedgerCard } from "@/components/ui/ledger";
import type { AgentGDPEntry } from "@/lib/agent-gdp";

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function netColor(n: number): string {
  if (n > 0) return "#4AE8A0";
  if (n < 0) return "#F46060";
  return "var(--muted)";
}

function scoreColor(s: number): string {
  if (s >= 75) return "#4AE8A0";
  if (s >= 50) return "#5B9EF4";
  if (s >= 25) return "#F4B942";
  return "var(--muted)";
}

const top3: Record<number, { bg: string; color: string }> = {
  1: { bg: "rgba(244,185,66,0.18)",  color: "#F4B942" },
  2: { bg: "rgba(209,213,219,0.12)", color: "#C0C8D8" },
  3: { bg: "rgba(180,120,80,0.15)",  color: "#D4956A" },
};

function RankMedal({ rank }: { rank: number }) {
  if (top3[rank]) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6,
        background: top3[rank].bg, color: top3[rank].color,
        fontWeight: 700, fontSize: "0.8rem", fontFamily: "var(--font-mono)",
        border: `1px solid color-mix(in srgb, ${top3[rank].color} 30%, transparent)`,
      }}>
        {rank}
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-mono)", minWidth: 24, display: "inline-block", textAlign: "center" }}>
      {rank}
    </span>
  );
}

type SortField = "revenue" | "treasury" | "net" | "coverage";

const SORT_PILLS: { label: string; field: SortField }[] = [
  { label: "Revenue",        field: "revenue"  },
  { label: "Treasury",       field: "treasury" },
  { label: "Net Position",   field: "net"      },
  { label: "Coverage Ratio", field: "coverage" },
];

const GRID = "40px 1fr 120px 120px 120px 80px 20px";

function coverageRatio(a: AgentGDPEntry): number {
  if (!a.treasury_balance_usd || a.expenses_usd <= 0) return 0;
  return a.treasury_balance_usd / (a.expenses_usd / 30);
}

export function LeaderboardTable({
  agents,
  vscoreMap,
}: {
  agents: AgentGDPEntry[];
  vscoreMap: Map<string, { total: number; tier: string }>;
}) {
  const [sortField, setSortField] = useState<SortField>("revenue");

  const sorted = useMemo(() => {
    return [...agents].sort((a, b) => {
      switch (sortField) {
        case "treasury":  return (b.treasury_balance_usd ?? 0) - (a.treasury_balance_usd ?? 0);
        case "net":       return b.net_income_usd - a.net_income_usd;
        case "coverage":  return coverageRatio(b) - coverageRatio(a);
        default:          return b.revenue_usd - a.revenue_usd;
      }
    });
  }, [agents, sortField]);

  if (agents.length === 0) {
    return (
      <div style={{
        padding: "48px 28px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        background: "var(--surface-soft)",
        textAlign: "center",
      }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.95rem" }}>No attributed agents yet.</p>
        <p style={{ margin: "0 0 24px", fontSize: "0.83rem", color: "var(--muted)", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Agents appear here once they declare a wallet manifest. Attribution is the prerequisite for inclusion.
        </p>
        <Link href="/registry#verify" className="lp-btn-primary">Submit Manifest →</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Sort pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {SORT_PILLS.map(({ label, field }) => {
          const active = sortField === field;
          return (
            <button
              key={field}
              onClick={() => setSortField(field)}
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: active ? "rgba(74,232,160,0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <LedgerCard eyebrow="Top Agents · 30 Days" style={{ marginBottom: 0 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            padding: "10px 16px",
            background: "var(--surface-soft)",
            borderBottom: "1px solid var(--line)",
          }}>
            {[
              { label: "#",           align: "center" },
              { label: "Agent",       align: "left"   },
              { label: "30D Revenue", align: "right"  },
              { label: "Treasury",    align: "right"  },
              { label: "Net (30D)",   align: "right"  },
              { label: "Score",       align: "right"  },
              { label: "",            align: "right"  },
            ].map((h, i) => (
              <div key={i} style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                textAlign: h.align as React.CSSProperties["textAlign"],
              }}>
                {h.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {sorted.map((agent, i) => {
            const net = agent.net_income_usd;
            const vscore = vscoreMap.get(agent.slug);
            const sc = vscore?.total ?? 0;
            return (
              <Link
                key={agent.slug}
                href={`/registry/${agent.slug}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: i === sorted.length - 1 ? "none" : "1px solid var(--line)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.1s",
                }}
                className="ldb-row"
              >
                <div style={{ textAlign: "center" }}>
                  <RankMedal rank={i + 1} />
                </div>

                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink)" }}>{agent.name}</span>
                  <div style={{ marginTop: 3, fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {agent.ecosystem}
                  </div>
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#4AE8A0", textAlign: "right" }}>
                  {fmtUSD(agent.revenue_usd)}
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.83rem", textAlign: "right" }}>
                  {agent.treasury_balance_usd != null
                    ? <span style={{ color: "#5B9EF4", fontWeight: 600 }}>{fmtUSD(agent.treasury_balance_usd)}</span>
                    : <span style={{ color: "var(--muted)" }}>—</span>}
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: netColor(net), textAlign: "right" }}>
                  {net >= 0 ? "+" : ""}{fmtUSD(net)}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: scoreColor(sc) }}>
                    {sc}
                  </span>
                </div>

                <div style={{ textAlign: "right", color: "var(--muted)", fontSize: "0.75rem" }}>→</div>
              </Link>
            );
          })}
        </div>
      </LedgerCard>
    </div>
  );
}
