"use client";

import { useState } from "react";
import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { TransactionsTable } from "@/components/product-widgets";
import { appTransactions } from "@/lib/app-demo-data";
import { formatCategory, formatUsdc, shortenAddress } from "@/lib/ledger";
import type { LedgerTransaction } from "@/lib/ledger";

export default function TransactionsPage() {
  const [selected, setSelected] = useState<LedgerTransaction | null>(appTransactions[0]);

  return (
    <AppShell>
      <PageHeader
        title="Transactions"
        description="Browse and analyze all wallet activity."
        actions={
          <>
            <WalletSelect />
            <DateFilter />
          </>
        }
      />

      <section className="transactions-layout">
        <div className="content-card wide">
          <div className="toolbar-row">
            <input placeholder="Search by hash, counterparty, or category" />
            <button type="button">Export CSV</button>
            <button type="button" className="primary-action">Filters</button>
          </div>
          <div className="filter-row">
            <button type="button">Date: Last 7 days</button>
            <button type="button">Type: All</button>
            <button type="button">Category: All</button>
            <button type="button">Amount: All</button>
            <a href="/transactions">Reset</a>
          </div>
          <TransactionsTable transactions={appTransactions} onSelect={setSelected} />
        </div>

        <aside className="detail-panel">
          <div className="card-heading">
            <h2>Transaction Details</h2>
            <button type="button" onClick={() => setSelected(null)}>×</button>
          </div>
          {selected ? (
            <div className="detail-list">
              <div>
                <span>Type</span>
                <strong>{selected.direction === "income" ? "Income" : "Spend"}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{formatUsdc(selected.amountUsdc)} USDC</strong>
              </div>
              <div>
                <span>Counterparty</span>
                <strong>{selected.counterparty}</strong>
              </div>
              <div>
                <span>Tx Hash</span>
                <strong>{shortenAddress(selected.txHash)}</strong>
              </div>
              <div>
                <span>Network</span>
                <strong>Base</strong>
              </div>
              <div>
                <span>AI Category</span>
                <strong>{formatCategory(selected.category || "unknown")}</strong>
              </div>
              <div>
                <span>AI Confidence</span>
                <strong>{selected.confidenceScore || 72}%</strong>
              </div>
              <div className="explanation">
                <span>AI Explanation</span>
                <p>{selected.memo || "This transaction matches a small repeated USDC payment pattern."}</p>
              </div>
              <a href={`https://basescan.org/tx/${selected.txHash}`}>View on Basescan</a>
            </div>
          ) : (
            <div className="empty-state compact">Select a transaction to inspect details.</div>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
