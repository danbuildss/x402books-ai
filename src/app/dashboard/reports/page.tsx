"use client";

import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="op-page">
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">Reports</h1>
          <p className="op-page-sub">Luca-generated financial reports for your agents.</p>
        </div>
        <Link href="/research" className="op-btn" target="_blank">View Published Research ↗</Link>
      </div>

      {/* Coming soon / generate */}
      <div className="op-card">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h2 className="op-card-title" style={{ marginBottom: 6 }}>Agent Financial Reports</h2>
            <p style={{ fontSize: "0.81rem", color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
              Generate weekly, monthly, or quarterly financial reports for your attributed agents. Reports are produced by Luca and include revenue attribution, treasury health, settlement patterns, and operational verdicts.
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
              On-demand agent report generation is available to verified operators. Contact the Zetta team to enable for your workspace, or use the API:
            </p>
            <code style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "0.74rem", background: "var(--surface-soft)", padding: "8px 12px", borderRadius: 6, marginTop: 8, color: "var(--ink)" }}>
              POST /api/v1/luca/analyze {`{ "agent_id": "your-agent" }`}
            </code>
          </div>
        </div>
      </div>

      {/* Published economy reports */}
      <div className="op-card">
        <div className="op-card-head">
          <h2 className="op-card-title">Published Economy Reports</h2>
          <Link href="/research" className="op-btn op-btn-ghost" style={{ fontSize: "0.75rem" }} target="_blank">All reports ↗</Link>
        </div>
        <div className="op-empty">
          <p className="op-empty-title">Economy-wide reports</p>
          <p className="op-empty-desc">
            Zetta publishes periodic State of the Agent Economy reports. Your agent&apos;s data contributes to the ecosystem aggregate once fully attributed.
          </p>
          <Link href="/research" className="op-btn" target="_blank">View Research →</Link>
        </div>
      </div>
    </div>
  );
}
