"use client";

import { useRef, useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, getCategorySummary } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function CategoriesPage() {
  const ledger = useLedgerState();
  const [tokenFilter, setTokenFilter] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only ecosystem tokens that appear in the portfolio
  const availableTokens = ledger.portfolio.map((e) => e.tokenSymbol);

  const filteredTransactions =
    tokenFilter === "all"
      ? ledger.transactions
      : ledger.transactions.filter((tx) => (tx.tokenSymbol || "USDC") === tokenFilter);

  const displayCategories =
    tokenFilter === "all" ? ledger.categories : getCategorySummary(filteredTransactions);

  const maxUsdc = Math.max(...displayCategories.map((c) => c.totalUsdc), 0.01);

  const activeLabel =
    tokenFilter === "all" ? "All tokens" : tokenFilter;

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

      {/* Token filter — compact dropdown */}
      {availableTokens.length > 0 && (
        <div className="stitch-token-dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="stitch-token-dropdown-btn"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>filter_list</span>
            {activeLabel}
            <span className="material-symbols-outlined" style={{ fontSize: 14, marginLeft: "auto" }}>
              {dropdownOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
          {dropdownOpen && (
            <div className="stitch-token-dropdown">
              <button
                type="button"
                className={`stitch-token-option${tokenFilter === "all" ? " active" : ""}`}
                onClick={() => { setTokenFilter("all"); setDropdownOpen(false); }}
              >
                All tokens
              </button>
              {availableTokens.map((sym) => {
                const entry = ledger.portfolio.find((e) => e.tokenSymbol === sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    className={`stitch-token-option${tokenFilter === sym ? " active" : ""}`}
                    onClick={() => { setTokenFilter(sym); setDropdownOpen(false); }}
                  >
                    <span style={{ fontFamily: "var(--st-mono)", fontWeight: 600 }}>{sym}</span>
                    {entry?.isAgentToken && <span className="stitch-agent-badge">AGENT</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <section className="stitch-card">
        {displayCategories.length ? (
          <div className="stitch-cat-list">
            {displayCategories.map((cat) => {
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
                    <strong style={{ fontFamily: "var(--st-mono)" }}>${formatUsdc(cat.totalUsdc)} USD</strong>
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

      {ledger.hasLedger && (
        <section className="stitch-card stitch-cat-insight">
          <div className="stitch-cat-insight-head">
            <h3>
              <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "var(--st-primary)" }}>auto_awesome</span>
              Category Insights
            </h3>
            <span className={`stitch-budget-badge ${ledger.report.budgetStatus}`}>
              <span className="stitch-budget-dot" />
              {ledger.report.budgetStatus === "healthy" ? "Healthy" : ledger.report.budgetStatus === "watch" ? "Watch" : "Overspending"}
            </span>
          </div>

          <div className="stitch-cat-insight-stats">
            <div className="stitch-cat-insight-stat">
              <span>Transactions</span>
              <strong>{ledger.summary.transactionCount}</strong>
            </div>
            <div className="stitch-cat-insight-stat">
              <span>x402 payments</span>
              <strong style={{ color: ledger.summary.likelyX402Count > 0 ? "var(--st-primary)" : "var(--st-muted)" }}>
                {ledger.summary.likelyX402Count}
              </strong>
            </div>
            <div className="stitch-cat-insight-stat">
              <span>Net flow</span>
              <strong style={{ color: ledger.summary.netFlow >= 0 ? "var(--st-green)" : "var(--st-red)" }}>
                {ledger.summary.netFlow >= 0 ? "+" : ""}{formatUsdc(ledger.summary.netFlow)} USDC
              </strong>
            </div>
            <div className="stitch-cat-insight-stat">
              <span>Top category</span>
              <strong>{ledger.report.topCategory}</strong>
            </div>
          </div>

          {ledger.categories.length > 0 && (
            <div className="stitch-cat-insight-bars">
              <p className="stitch-cat-insight-label">Top spend categories</p>
              {ledger.categories.slice(0, 3).map((cat) => {
                const maxUsdc2 = ledger.categories[0]?.totalUsdc || 1;
                const pct = (cat.totalUsdc / maxUsdc2) * 100;
                return (
                  <div key={cat.category} className="stitch-cat-insight-bar-row">
                    <span className={`stitch-chip ${cat.category}`} style={{ fontSize: "10px", padding: "2px 7px" }}>{cat.label}</span>
                    <div className="stitch-cat-bar-track" style={{ flex: 1 }}>
                      <div className="stitch-cat-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span style={{ fontFamily: "var(--st-mono)", fontSize: "12px", color: "var(--st-text)", minWidth: "80px", textAlign: "right" }}>
                      {formatUsdc(cat.totalUsdc)} USDC
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--st-muted)", minWidth: "36px", textAlign: "right" }}>
                      {cat.count} tx
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="stitch-cat-insight-narrative">{ledger.report.narrative}</p>
        </section>
      )}

      {!ledger.hasLedger && (
        <section className="stitch-card stitch-insight">
          <span>AI</span>
          <div>
            <h3>Category Insights</h3>
            <p>Insights appear after a wallet scan.</p>
          </div>
        </section>
      )}
    </StitchShell>
  );
}
