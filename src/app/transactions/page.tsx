"use client";

import { useMemo, useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
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
  const [query, setQuery]         = useState("");
  const [direction, setDirection] = useState("all");
  const [category, setCategory]   = useState("all");

  const rows = useMemo(
    () =>
      ledger.transactions.filter((tx) => {
        const hay = [tx.txHash, tx.counterparty, tx.category, tx.memo]
          .join(" ")
          .toLowerCase();
        return (
          (!query || hay.includes(query.toLowerCase())) &&
          (direction === "all" || tx.direction === direction) &&
          (category  === "all" || tx.category  === category)
        );
      }),
    [category, direction, ledger.transactions, query],
  );

  const cycleDir = () =>
    setDirection((d) => (d === "all" ? "expense" : d === "expense" ? "income" : "all"));

  return (
    <StitchShell>
      <StitchHeader
        title="Transactions"
        description="Browse and analyse every scanned wallet transfer."
        actions={
          <>
            <StitchWalletPill
              wallet={ledger.wallet}
              onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
            />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <section className="stitch-transactions-layout">
        {/* ---- Ledger table ---- */}
        <div className="stitch-card" style={{ padding: "20px 24px" }}>
          <div className="stitch-toolbar">
            <input
              placeholder="Search by hash, address, or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="stitch-button"
              type="button"
              disabled={!ledger.transactions.length || ledger.isCategorizing}
              onClick={ledger.categorizeTransactions}
            >
              {ledger.isCategorizing ? "Categorizing…" : "AI Categorize"}
            </button>
            <button
              className="stitch-button"
              type="button"
              disabled={!ledger.transactions.length}
              onClick={ledger.exportCsv}
            >
              <StitchIcon name="download" /> CSV
            </button>
          </div>

          <div className="stitch-filters">
            <button type="button">Date: {ledger.range}</button>
            <button type="button" onClick={cycleDir}>
              Type: {direction}
            </button>
            <button
              type="button"
              onClick={() => setCategory((c) => (c === "all" ? "api_call" : "all"))}
            >
              Category: {category}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDirection("all");
                setCategory("all");
              }}
            >
              Reset
            </button>
          </div>

          {rows.length ? (
            <StitchTransactionsTable transactions={rows} onSelect={setSelected} />
          ) : (
            <StitchEmpty>No transactions found. Scan a Base wallet from Overview.</StitchEmpty>
          )}

          {rows.length > 0 && (
            <p style={{ fontSize: "11px", color: "var(--s-muted)", marginTop: "12px", marginBottom: 0 }}>
              Showing {rows.length} of {ledger.transactions.length} transactions
            </p>
          )}
        </div>

        {/* ---- Detail panel ---- */}
        <aside className="stitch-card stitch-detail" style={{ padding: "18px 20px" }}>
          <div className="stitch-card-head">
            <h3>Transaction Details</h3>
            {selected && (
              <button type="button" onClick={() => setSelected(null)}>
                <StitchIcon name="close" />
              </button>
            )}
          </div>

          {selected ? (
            <div className="stitch-detail-body">
              <div className="stitch-ai-badge">
                <StitchIcon name="auto_awesome" /> AI Interpretation
              </div>
              <p style={{ fontSize: "13px", color: "var(--s-muted)", lineHeight: "1.6", margin: "0 0 8px" }}>
                {selected.memo ?? "Rules-based classification."}
              </p>

              <div className="stitch-detail-row">
                <span>Tx Hash</span>
                <strong>{shortenAddress(selected.txHash)}</strong>
              </div>
              <div className="stitch-detail-row">
                <span>Type</span>
                <strong style={{ fontFamily: "inherit" }}>
                  {selected.direction === "income" ? "Income" : "Spend"}
                </strong>
              </div>
              <div className="stitch-detail-row">
                <span>Amount</span>
                <strong style={{ fontFamily: "inherit" }}>
                  {formatUsdc(selected.amountUsdc)} USDC
                </strong>
              </div>
              <div className="stitch-detail-row">
                <span>Counterparty</span>
                <strong>{shortenAddress(selected.counterparty)}</strong>
              </div>
              <div className="stitch-detail-row">
                <span>Timestamp</span>
                <strong style={{ fontFamily: "inherit" }}>
                  {relativeTime(selected.timestamp)}
                </strong>
              </div>
              <div className="stitch-detail-row">
                <span>Network</span>
                <strong style={{ fontFamily: "inherit" }}>Base Mainnet</strong>
              </div>
              <div className="stitch-detail-row">
                <span>Category</span>
                <strong style={{ fontFamily: "inherit" }}>
                  {formatCategory(selected.category ?? "unknown")}
                </strong>
              </div>
              <div className="stitch-detail-row">
                <span>AI Confidence</span>
                <strong style={{ fontFamily: "inherit" }}>
                  {selected.confidenceScore ?? 0}%
                </strong>
                <div className="stitch-confidence">
                  <div
                    className="stitch-confidence-fill"
                    style={{ width: `${selected.confidenceScore ?? 0}%` }}
                  />
                </div>
              </div>
              {selected.x402Reason && (
                <div className="stitch-detail-row">
                  <span>Classification Logic</span>
                  <p>{selected.x402Reason}</p>
                </div>
              )}

              <a
                className="stitch-detail-link"
                href={`https://basescan.org/tx/${selected.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View on Basescan
                <StitchIcon name="open_in_new" />
              </a>
            </div>
          ) : (
            <StitchEmpty compact>Select a transaction to inspect AI analysis and details.</StitchEmpty>
          )}
        </aside>
      </section>
    </StitchShell>
  );
}
