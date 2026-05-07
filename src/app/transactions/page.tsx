"use client";

import { useMemo, useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchRange,
  StitchShell,
  StitchTransactionsTable,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatCategory, formatUsdc, relativeTime, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";
import type { LedgerTransaction } from "@/lib/ledger";

export default function TransactionsPage() {
  const ledger = useLedgerState();
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [category, setCategory] = useState("all");

  const rows = useMemo(
    () =>
      ledger.transactions.filter((transaction) => {
        const haystack = [
          transaction.txHash,
          transaction.counterparty,
          transaction.category,
          transaction.memo,
        ].join(" ").toLowerCase();
        return (
          (!query || haystack.includes(query.toLowerCase())) &&
          (direction === "all" || transaction.direction === direction) &&
          (category === "all" || transaction.category === category)
        );
      }),
    [category, direction, ledger.transactions, query],
  );

  return (
    <StitchShell>
      <StitchHeader
        title="Transactions"
        description="Browse and analyze every scanned wallet transfer."
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <section className="stitch-transactions-layout">
        <div className="stitch-card">
          <div className="stitch-toolbar">
            <input placeholder="Search by hash, counterparty, or category" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="button" onClick={ledger.exportCsv}>Export CSV</button>
            <button type="button" onClick={ledger.categorizeTransactions} disabled={!ledger.transactions.length || ledger.isCategorizing}>
              {ledger.isCategorizing ? "Categorizing..." : "AI Categorize"}
            </button>
          </div>
          <div className="stitch-filters">
            <button type="button">Date: {ledger.range}</button>
            <button type="button" onClick={() => setDirection(direction === "expense" ? "income" : direction === "income" ? "all" : "expense")}>
              Type: {direction}
            </button>
            <button type="button" onClick={() => setCategory(category === "all" ? "api_call" : "all")}>
              Category: {category}
            </button>
            <button type="button">Amount: All</button>
            <button type="button" onClick={() => { setQuery(""); setDirection("all"); setCategory("all"); }}>
              Reset
            </button>
          </div>
          {rows.length ? (
            <StitchTransactionsTable transactions={rows} onSelect={setSelected} />
          ) : (
            <StitchEmpty>No transactions found. Scan a Base wallet from Overview.</StitchEmpty>
          )}
        </div>

        <aside className="stitch-card stitch-detail">
          <div className="stitch-card-head">
            <h3>Transaction Details</h3>
            <button type="button" onClick={() => setSelected(null)}>Close</button>
          </div>
          {selected ? (
            <div className="stitch-detail-list">
              <div><span>Type</span><strong>{selected.direction === "income" ? "Income" : "Spend"}</strong></div>
              <div><span>Amount</span><strong>{formatUsdc(selected.amountUsdc)} USDC</strong></div>
              <div><span>Counterparty</span><strong>{shortenAddress(selected.counterparty)}</strong></div>
              <div><span>Time</span><strong>{relativeTime(selected.timestamp)}</strong></div>
              <div><span>Tx Hash</span><strong>{shortenAddress(selected.txHash)}</strong></div>
              <div><span>Network</span><strong>Base</strong></div>
              <div><span>AI Category</span><strong>{formatCategory(selected.category || "unknown")}</strong></div>
              <div><span>AI Confidence</span><strong>{selected.confidenceScore || 0}%</strong></div>
              <div><span>Classification Logic</span><p>{selected.x402Reason || selected.memo || "Rules first, AI second."}</p></div>
              <a href={`https://basescan.org/tx/${selected.txHash}`} target="_blank" rel="noreferrer">View on Basescan</a>
            </div>
          ) : (
            <StitchEmpty compact>Select a transaction to inspect details.</StitchEmpty>
          )}
        </aside>
      </section>
    </StitchShell>
  );
}

