"use client";

import {
  StitchEmpty,
  StitchHeader,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function CategoriesPage() {
  const ledger = useLedgerState();
  const maxUsdc = Math.max(...ledger.categories.map((c) => c.totalUsdc), 0.01);

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
          <div className="stitch-cat-list">
            {ledger.categories.map((cat) => {
              const spendShare = ledger.summary.totalSpend
                ? (cat.totalUsdc / ledger.summary.totalSpend) * 100
                : 0;
              const barPct = (cat.totalUsdc / maxUsdc) * 100;
              return (
                <div key={cat.category} className="stitch-cat-row">
                  <div className="stitch-cat-label-col">
                    <span className={`stitch-chip ${cat.category}`}>{cat.label}</span>
                    <span className="stitch-cat-count">{cat.count} tx</span>
                  </div>
                  <div className="stitch-cat-bar-col">
                    <div className="stitch-cat-bar-track">
                      <div className="stitch-cat-bar-fill" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                  <div className="stitch-cat-amount-col">
                    <strong style={{ fontFamily: "var(--st-mono)" }}>{formatUsdc(cat.totalUsdc)} USDC</strong>
                    <span style={{ color: "var(--st-muted)", fontSize: "11px" }}>{spendShare.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <StitchEmpty>Scan a wallet to generate category breakdowns.</StitchEmpty>
        )}
      </section>

      {/* Income-only categories */}
      {ledger.transactions.some((tx) => tx.direction === "income") && (
        <section className="stitch-card">
          <div className="stitch-card-head"><h3>Income Breakdown</h3></div>
          <div className="stitch-cat-list">
            {ledger.categories
              .filter((cat) =>
                ledger.transactions.some(
                  (tx) => tx.category === cat.category && tx.direction === "income",
                ),
              )
              .map((cat) => {
                const incomeForCat = ledger.transactions
                  .filter((tx) => tx.category === cat.category && tx.direction === "income")
                  .reduce((sum, tx) => sum + tx.amountUsdc, 0);
                const pct = ledger.summary.totalIncome
                  ? (incomeForCat / ledger.summary.totalIncome) * 100
                  : 0;
                const barPct = (incomeForCat / Math.max(ledger.summary.totalIncome, 0.01)) * 100;
                return (
                  <div key={cat.category} className="stitch-cat-row">
                    <div className="stitch-cat-label-col">
                      <span className={`stitch-chip ${cat.category}`}>{cat.label}</span>
                    </div>
                    <div className="stitch-cat-bar-col">
                      <div className="stitch-cat-bar-track">
                        <div className="stitch-cat-bar-fill income" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                    <div className="stitch-cat-amount-col">
                      <strong style={{ fontFamily: "var(--st-mono)", color: "var(--st-green)" }}>
                        +{formatUsdc(incomeForCat)} USDC
                      </strong>
                      <span style={{ color: "var(--st-muted)", fontSize: "11px" }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

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
