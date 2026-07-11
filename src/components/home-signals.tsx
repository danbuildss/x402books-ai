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
    { eco: "AEON", color: "#8B7CF6", text: "Operating revenue trending up — attribution coverage complete across declared wallets.", ago: "—" },
    { eco: "BANKR", color: "#4AE8A0", text: "Treasury inflows detected. Multi-sig wallet activity indexed.", ago: "—" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "New attribution confirmed: wallets indexed and classified.", ago: "—" },
    { eco: "GAME", color: "#F97316", text: "Revenue activity classified — inference spend rising proportionally.", ago: "—" },
  ],
  revenue: [
    { eco: "AEON", color: "#8B7CF6", text: "Attributed operating revenue available. Submit wallet manifest to view.", ago: "—" },
    { eco: "BANKR", color: "#4AE8A0", text: "Revenue tracked across declared wallets. Attribution coverage active.", ago: "—" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "Revenue indexed since attribution expanded to additional wallets.", ago: "—" },
    { eco: "SYNTH", color: "#EF4444", text: "Small attribution base. Revenue classification in progress.", ago: "—" },
  ],
  treasury: [
    { eco: "BANKR", color: "#4AE8A0", text: "Multi-sig treasury inflow detected and classified. Quarantined from revenue.", ago: "—" },
    { eco: "AEON", color: "#8B7CF6", text: "Treasury wallet declared. Holdings tracked via attribution layer.", ago: "—" },
    { eco: "VIRTUALS", color: "#5B8FA8", text: "Treasury rebalance activity detected. Classified as internal transfer.", ago: "—" },
    { eco: "EIGENCLOUD", color: "#F97316", text: "Capital injection flagged — quarantined from revenue classification.", ago: "—" },
  ],
  new: [
    { eco: "SYNTH", color: "#EF4444", text: "New wallet manifest submitted — attribution pending review.", ago: "—" },
    { eco: "GAME", color: "#F97316", text: "New wallets attributed to GAME ecosystem.", ago: "—" },
    { eco: "BANKR", color: "#4AE8A0", text: "Secondary fee wallet confirmed and indexed.", ago: "—" },
    { eco: "BASE", color: "#5B9EF4", text: "New agent submitted via registry — awaiting verification.", ago: "—" },
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
          <span style={{ fontSize: "0.65rem", color: "#4AE8A0", fontFamily: "var(--font-mono)" }}>
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
