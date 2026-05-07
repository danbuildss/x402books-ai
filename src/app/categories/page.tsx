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

function trendFor(index: number, total: number) {
  return [1, 1.2, 0.9, 1.4, 1.1, 1.6].map((value) => value * Math.max(1, total) * (index + 1));
}

export default function CategoriesPage() {
  const ledger = useLedgerState();

  return (
    <StitchShell>
      <StitchHeader
        title="Categories"
        description="AI-categorized breakdown of scanned wallet activity."
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
            <button className="stitch-button" type="button" onClick={ledger.exportCsv}>Export CSV</button>
          </>
        }
      />

      <section className="stitch-card">
        {ledger.categories.length ? (
          <div className="stitch-table-wrap">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Amount</th>
                  <th>% of Spend</th>
                  <th>Transactions</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {ledger.categories.map((category, index) => {
                  const share = ledger.summary.totalSpend
                    ? (category.totalUsdc / ledger.summary.totalSpend) * 100
                    : 0;
                  return (
                    <tr key={category.category}>
                      <td><span className={`stitch-chip ${category.category}`}>{category.label}</span></td>
                      <td>${formatUsdc(category.totalUsdc)}</td>
                      <td>{share.toFixed(1)}%</td>
                      <td>{category.count}</td>
                      <td><StitchMiniTrend values={trendFor(index, category.totalUsdc)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <StitchEmpty>Scan a wallet to generate category breakdowns.</StitchEmpty>
        )}
      </section>

      <section className="stitch-card stitch-insight">
        <span>AI</span>
        <div>
          <h3>Category Insights</h3>
          <p>{ledger.hasLedger ? ledger.report.narrative : "Insights appear after a wallet scan."}</p>
        </div>
      </section>
    </StitchShell>
  );
}

