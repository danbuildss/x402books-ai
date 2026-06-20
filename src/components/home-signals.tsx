"use client";

import { useState } from "react";
import Link from "next/link";

type Signal = { eco: string; color: string; text: string; ago: string };

const TABS = [
  { key: "growing", label: "Top Growing" },
  { key: "revenue", label: "Revenue" },
  { key: "treasury", label: "Treasury" },
  { key: "new", label: "Newly Attributed" },
] as const;
type TabKey = typeof TABS[number]["key"];

const STATIC: Record<TabKey, Signal[]> = {
  growing: [
    { eco: "AEON", color: "#8B5CF6", text: "Operating revenue increased 32.5% in the last 30 days.", ago: "12m ago" },
    { eco: "BANKR", color: "#6DB874", text: "Treasury inflows up 18.1% with multi-sig activity detected.", ago: "34m ago" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "New attribution confirmed: 3 wallets indexed.", ago: "1h ago" },
    { eco: "GAME", color: "#F97316", text: "Revenue grew 15.7% — inference spend up proportionally.", ago: "2h ago" },
  ],
  revenue: [
    { eco: "AEON", color: "#8B5CF6", text: "$18.2K attributed operating revenue — highest in 30d window.", ago: "live" },
    { eco: "BANKR", color: "#6DB874", text: "$12.4K revenue tracked across 4 wallets.", ago: "6m ago" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "$9.1K — new high since attribution expanded.", ago: "18m ago" },
    { eco: "SYNTH", color: "#EF4444", text: "$2.8K — small base but accelerating.", ago: "44m ago" },
  ],
  treasury: [
    { eco: "BANKR", color: "#6DB874", text: "Multi-sig treasury inflow detected: $6.2K.", ago: "22m ago" },
    { eco: "AEON", color: "#8B5CF6", text: "Treasury holds $8.7M — unchanged vs 7d prior.", ago: "1h ago" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "Treasury rebalance: $4.1K moved to operational wallet.", ago: "2h ago" },
    { eco: "EIGENCLOUD", color: "#F97316", text: "Capital injection flagged — quarantined from revenue.", ago: "3h ago" },
  ],
  new: [
    { eco: "SYNTH", color: "#EF4444", text: "New wallet manifest submitted — attribution pending review.", ago: "4m ago" },
    { eco: "GAME", color: "#F97316", text: "2 new wallets attributed to GAME ecosystem.", ago: "1h ago" },
    { eco: "BANKR", color: "#6DB874", text: "Secondary fee wallet confirmed and indexed.", ago: "3h ago" },
    { eco: "BASE", color: "#4F46E5", text: "New agent submitted via registry — awaiting verification.", ago: "5h ago" },
  ],
};

export function HomeSignals({ liveSignals }: { liveSignals?: Signal[] }) {
  const [tab, setTab] = useState<TabKey>("growing");

  const signals = tab === "growing" && liveSignals?.length ? liveSignals : STATIC[tab];

  return (
    <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 40px" }}>
      <div className="zetta-data-panel">
        <div className="zetta-panel-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="hs-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`hs-tab${tab === t.key ? " hs-tab-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.65rem", color: "#6DB874", fontFamily: "var(--font-mono)" }}>
            &#9679; Updated hourly
          </span>
        </div>
        <div className="hs-signal-list">
          {signals.map((sig, i) => (
            <div key={i} className="zetta-signal-row hs-row" style={{ animationDelay: `${i * 45}ms` }}>
              <span className="zetta-signal-dot" style={{ background: sig.color }} />
              <span style={{ fontWeight: 600, fontSize: "0.74rem", color: "var(--muted)", minWidth: 88 }}>{sig.eco}</span>
              <span style={{ color: "var(--ink)", flex: 1, fontSize: "0.82rem" }}>{sig.text}</span>
              <span className="zetta-signal-time">{sig.ago}</span>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 10, borderTop: "1px solid var(--line)", marginTop: 6 }}>
          <Link href="/leaderboard" style={{ fontSize: "0.74rem", color: "var(--accent)", fontWeight: 600 }}>
            View full leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
