"use client";

import {
  StitchEmpty,
  StitchHeader,
  StitchMiniTrend,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

const CATEGORY_ICONS: Record<string, string> = {
  api_call:          "api",
  data_access:       "database",
  compute:           "memory",
  agent_service:     "smart_toy",
  subscription:      "autorenew",
  income:            "north_east",
  refund:            "undo",
  internal_transfer: "swap_horiz",
  unknown:           "help_outline",
};

const CAT_COLORS: Record<string, string> = {
  api_call:          "#47c78b",
  data_access:       "#7aa2ff",
  compute:           "#ffbdb3",
  agent_service:     "#c4a0ff",
  subscription:      "#7aa2ff",
  income:            "#47c78b",
  refund:            "#47c78b",
  internal_transfer: "#9ca69f",
  unknown:           "#9ca69f",
};

function mockTrend(index: number, count: number): number[] {
  return [0.8, 1.2, 0.9, 1.5, 1.1, 1.7, 1.3].map(
    (v) => v * Math.max(1, count) * (1 + index * 0.15),
  );
}

export default function CategoriesPage() {
  const ledger = useLedgerState();
  const totalSpend = ledger.summary.totalSpend;

  return (
    <StitchShell>
      <StitchHeader
        title="Categories"
        description="AI-categorised breakdown of scanned wallet activity."
        actions={
          <>
            <StitchWalletPill
              wallet={ledger.wallet}
              onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
            />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
            <button className="stitch-button" type="button" onClick={ledger.exportCsv}>
              Export CSV
            </button>
          </>
        }
      />

      {/* ---- Top stat cards ---- */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "14px" }}>
        <div className="stitch-card">
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 6px" }}>
            Total Monthly Expenditure
          </p>
          <p style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-0.025em", color: "var(--s-ink)", margin: "0 0 8px", fontVariantNumeric: "tabular-nums" }}>
            ${formatUsdc(totalSpend)}
          </p>
          <div style={{ display: "flex", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 2px" }}>
                Average Daily
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--s-ink)", margin: 0 }}>
                ${formatUsdc(totalSpend / (ledger.range === "7d" ? 7 : 30))}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 2px" }}>
                Active Categories
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--s-ink)", margin: 0 }}>
                {ledger.categories.length} Entities
              </p>
            </div>
          </div>
        </div>

        <div className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: 0 }}>
            Top Sector
          </p>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--s-primary)", margin: 0 }}>
            {ledger.categories[0]?.label ?? "—"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--s-muted)", margin: "0 0 auto" }}>
            {ledger.categories[0]
              ? `Dominates ${totalSpend > 0 ? ((ledger.categories[0].totalUsdc / totalSpend) * 100).toFixed(1) : "0"}% of spend`
              : "Scan a wallet to see categories"}
          </p>
          {ledger.categories[0] && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)" }}>
                Efficiency Score
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--s-primary)", marginLeft: "auto" }}>
                94%
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ---- Category table ---- */}
      <div className="stitch-card" style={{ padding: "20px 24px" }}>
        <div className="stitch-card-head">
          <h3>AI-Categorised Activity</h3>
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="stitch-button" type="button" style={{ padding: "4px 10px", fontSize: "11px" }}>
              7d
            </button>
            <button className="stitch-button" type="button" style={{ padding: "4px 10px", fontSize: "11px" }}>
              All
            </button>
          </div>
        </div>

        {ledger.categories.length ? (
          <div className="stitch-table-wrap">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th style={{ textAlign: "right" }}>Total Spend</th>
                  <th style={{ textAlign: "right" }}>Percentage</th>
                  <th style={{ textAlign: "right" }}>Transactions</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {ledger.categories.map((cat, index) => {
                  const share = totalSpend > 0 ? (cat.totalUsdc / totalSpend) * 100 : 0;
                  const color = CAT_COLORS[cat.category] ?? "#9ca69f";
                  const iconName = CATEGORY_ICONS[cat.category] ?? "category";
                  return (
                    <tr key={cat.category}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              background: `${color}18`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "15px", color, fontVariationSettings: "'FILL' 1" }}
                            >
                              {iconName}
                            </span>
                          </span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--s-ink)" }}>
                              {cat.label}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--s-muted)" }}>
                              {cat.category === "api_call"      ? "Endpoint & gateway requests" :
                               cat.category === "data_access"   ? "Storage and retrieval I/O" :
                               cat.category === "compute"       ? "GPU and CPU runtime" :
                               cat.category === "agent_service" ? "Automated workflow orchestration" :
                               cat.category === "subscription"  ? "Recurring service fees" :
                               cat.category === "income"        ? "Incoming USDC payments" :
                               "Unclassified chain activity"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        ${formatUsdc(cat.totalUsdc)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "100px",
                          background: `${color}14`,
                          color,
                        }}>
                          {share.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--s-muted)", fontSize: "13px" }}>
                        {cat.count}
                      </td>
                      <td>
                        <StitchMiniTrend values={mockTrend(index, cat.count)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <StitchEmpty>Scan a wallet to generate category breakdowns.</StitchEmpty>
        )}

        {ledger.categories.length > 0 && (
          <div className="stitch-status-bar" style={{ marginTop: "16px" }}>
            <span className="status-dot" />
            <strong>AI Auto-Classification Active</strong>
            <span>—</span>
            <span>
              {((ledger.transactions.filter((t) => t.category && t.category !== "unknown").length /
                Math.max(1, ledger.transactions.length)) * 100).toFixed(1)}% of transactions automatically mapped to optimised buckets.
            </span>
          </div>
        )}
      </div>

      {/* ---- AI insight ---- */}
      <div className="stitch-card stitch-insight">
        <span className="stitch-insight-badge">AI</span>
        <div>
          <h3>Category Insights</h3>
          <p>
            {ledger.hasLedger
              ? ledger.report.narrative
              : "Insights appear after a wallet scan. Paste a Base address on the Overview page to get started."}
          </p>
        </div>
      </div>
    </StitchShell>
  );
}
