"use client";

import { useMemo, useState } from "react";
import {
  CopyBtn,
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
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [category, setCategory] = useState("all");

  const rows = useMemo(
    () =>
      ledger.transactions.filter((tx) => {
        const hay = [tx.txHash, tx.counterparty, tx.category, tx.memo].join(" ").toLowerCase();
        return (
          (!query || hay.includes(query.toLowerCase())) &&
          (direction === "all" || tx.direction === direction) &&
          (category === "all" || tx.category === category)
        );
      }),
    [category, direction, ledger.transactions, query],
  );

  return (
    <StitchShell>
      <StitchHeader
        title="Transactions"
        description={`Browse and analyze wallet transfers · ${ledger.range === "7d" ? "Last 7 days" : "Last 30 days"}`}
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      <section className="stitch-transactions-layout">
        {/* ---- Transaction list ---- */}
        <div className="stitch-card">
          <div className="stitch-toolbar">
            <input
              placeholder="Search by hash, address, or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="stitch-button" onClick={ledger.exportCsv}>
              <StitchIcon name="download" /> Export CSV
            </button>
            <button
              type="button"
              className="stitch-button"
              onClick={ledger.categorizeTransactions}
              disabled={!ledger.transactions.length || ledger.isCategorizing}
            >
              {ledger.isCategorizing ? "Categorizing…" : "AI Categorize"}
            </button>
          </div>

          <div className="stitch-filters">
            <button
              type="button"
              className={direction === "all" ? "active" : ""}
              onClick={() => setDirection("all")}
            >
              All
            </button>
            <button
              type="button"
              className={direction === "income" ? "active" : ""}
              onClick={() => setDirection(direction === "income" ? "all" : "income")}
            >
              <StitchIcon name="north_east" /> Income
            </button>
            <button
              type="button"
              className={direction === "expense" ? "active" : ""}
              onClick={() => setDirection(direction === "expense" ? "all" : "expense")}
            >
              <StitchIcon name="south_east" /> Spend
            </button>
            <button
              type="button"
              onClick={() => { setQuery(""); setDirection("all"); setCategory("all"); }}
            >
              <StitchIcon name="close" /> Reset
            </button>
          </div>

          {rows.length ? (
            <StitchTransactionsTable transactions={rows} onSelect={setSelected} onCategoryChange={ledger.updateCategory} />
          ) : (
            <StitchEmpty>
              {ledger.transactions.length
                ? "No transactions match your filters."
                : "Scan a Base wallet from Overview to see transactions."}
            </StitchEmpty>
          )}
        </div>

        {/* ---- Detail panel ---- */}
        <aside className="stitch-card stitch-detail">
          <div className="stitch-card-head">
            <h3>Transaction Details</h3>
            {selected && (
              <button type="button" className="stitch-button" style={{ fontSize: "12px", minHeight: "28px", padding: "0 10px" }} onClick={() => setSelected(null)}>
                <StitchIcon name="close" /> Close
              </button>
            )}
          </div>

          {selected ? (
            <div className="stitch-detail-list">
              <div>
                <span>Type</span>
                <strong className={selected.direction === "income" ? "income" : "expense"}>
                  {selected.direction === "income" ? "Income" : "Spend"}
                </strong>
              </div>

              <div>
                <span>Amount (USDC)</span>
                <strong style={{ fontFamily: "var(--st-mono)", fontVariantNumeric: "tabular-nums" }}>
                  {formatUsdc(selected.amountUsdc)} USDC
                </strong>
              </div>

              <div>
                <span>Counterparty</span>
                <strong style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--st-mono)", fontSize: "12px" }}>
                  {shortenAddress(selected.counterparty)}
                  <CopyBtn value={selected.counterparty} label="counterparty" onCopy={ledger.copyText} copied={ledger.copied} />
                </strong>
              </div>

              <div>
                <span>Tx Hash</span>
                <strong style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--st-mono)", fontSize: "12px" }}>
                  {shortenAddress(selected.txHash)}
                  <CopyBtn value={selected.txHash} label="txhash" onCopy={ledger.copyText} copied={ledger.copied} />
                </strong>
              </div>

              <div>
                <span>Time</span>
                <strong>{relativeTime(selected.timestamp)}</strong>
              </div>

              <div>
                <span>Network</span>
                <strong>Base (L2)</strong>
              </div>

              <div>
                <span>AI Category</span>
                <strong>{formatCategory(selected.category || "unknown")}</strong>
              </div>

              <div>
                <span>AI Confidence</span>
                <strong>{selected.confidenceScore ?? 0}%</strong>
              </div>

              {selected.isLikelyX402 && (
                <div>
                  <span>x402 Signal</span>
                  <strong style={{ color: "var(--st-green)" }}>Likely agent micropayment</strong>
                </div>
              )}

              {(selected.x402Reason || selected.memo) && (
                <div>
                  <span>Classification note</span>
                  <p>{selected.x402Reason || selected.memo}</p>
                </div>
              )}

              {/* Action links */}
              <div className="stitch-detail-actions">
                <a
                  href={`https://basescan.org/tx/${selected.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="stitch-detail-list a stitch-basescan-link"
                >
                  <StitchIcon name="open_in_new" /> View tx on Basescan
                </a>
                <a
                  href={`https://basescan.org/address/${selected.counterparty}`}
                  target="_blank"
                  rel="noreferrer"
                  className="stitch-basescan-link"
                >
                  <StitchIcon name="open_in_new" /> View address on Basescan
                </a>
              </div>
            </div>
          ) : (
            <StitchEmpty compact>Click any transaction row to inspect details.</StitchEmpty>
          )}
        </aside>
      </section>
    </StitchShell>
  );
}
