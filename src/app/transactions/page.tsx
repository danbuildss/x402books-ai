"use client";

import { useMemo, useState } from "react";
import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { TransactionsTable } from "@/components/product-widgets";
import { formatCategory, formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";
import type { LedgerTransaction } from "@/lib/ledger";

export default function TransactionsPage() {
  const ledger = useLedgerState();
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [category, setCategory] = useState("all");

  const rows = useMemo(() => {
    return ledger.transactions.filter((transaction) => {
      const haystack = [
        transaction.txHash,
        transaction.counterparty,
        transaction.category,
        transaction.memo,
      ].join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesDirection = direction === "all" || transaction.direction === direction;
      const matchesCategory = category === "all" || transaction.category === category;
      return matchesQuery && matchesDirection && matchesCategory;
    });
  }, [category, direction, ledger.transactions, query]);

  return (
    <AppShell>
      <PageHeader
        title="Transactions"
        description="Browse and analyze all wallet activity."
        actions={
          <>
            <WalletSelect wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <DateFilter range={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <section className="transactions-layout">
        <div className="content-card wide">
          <div className="toolbar-row">
            <input
              placeholder="Search by hash, counterparty, or category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={ledger.exportCsv}>Export CSV</button>
            <button type="button" className="primary-action" onClick={ledger.categorizeTransactions}>
              {ledger.isCategorizing ? "Categorizing..." : "AI Filters"}
            </button>
          </div>
          <div className="filter-row">
            <button type="button">Date: {ledger.range}</button>
            <button
              type="button"
              onClick={() => setDirection(direction === "expense" ? "income" : direction === "income" ? "all" : "expense")}
            >
              Type: {direction}
            </button>
            <button
              type="button"
              onClick={() => setCategory(category === "all" ? "api_call" : "all")}
            >
              Category: {category}
            </button>
            <button type="button">Amount: All</button>
            <button type="button" onClick={() => { setQuery(""); setDirection("all"); setCategory("all"); }}>
              Reset
            </button>
          </div>
          {rows.length ? (
            <TransactionsTable transactions={rows} onSelect={setSelected} />
          ) : (
            <div className="empty-state">No transactions match these filters.</div>
          )}
        </div>

        <aside className="detail-panel">
          <div className="card-heading">
            <h2>Transaction Details</h2>
            <button type="button" onClick={() => setSelected(null)}>×</button>
          </div>
          {selected ? (
            <div className="detail-list">
              <div><span>Type</span><strong>{selected.direction === "income" ? "Income" : "Spend"}</strong></div>
              <div><span>Amount</span><strong>{formatUsdc(selected.amountUsdc)} USDC</strong></div>
              <div><span>Counterparty</span><strong>{selected.counterparty}</strong></div>
              <div><span>Tx Hash</span><strong>{shortenAddress(selected.txHash)}</strong></div>
              <div><span>Network</span><strong>Base</strong></div>
              <div><span>AI Category</span><strong>{formatCategory(selected.category || "unknown")}</strong></div>
              <div><span>AI Confidence</span><strong>{selected.confidenceScore || 0}%</strong></div>
              <div><span>x402 Signal</span><strong>{selected.isLikelyX402 ? "Likely x402" : "Unknown"}</strong></div>
              <div className="explanation">
                <span>Classification Logic</span>
                <p>{selected.x402Reason || selected.memo || "Rules first, AI second. Unknown when signal is weak."}</p>
              </div>
              <a href={`https://basescan.org/tx/${selected.txHash}`} target="_blank" rel="noreferrer">
                View on Basescan
              </a>
            </div>
          ) : (
            <div className="empty-state compact">Select a transaction to inspect details.</div>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
