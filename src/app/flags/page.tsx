"use client";

import { useMemo, useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, relativeTime, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";
import type { LedgerRiskFlag, LedgerTransaction } from "@/lib/ledger";

const REVIEWED_KEY = "x402books_reviewed_flags";

function readReviewed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(REVIEWED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function writeReviewed(set: Set<string>) {
  window.localStorage.setItem(REVIEWED_KEY, JSON.stringify([...set]));
}

const FLAG_META: Record<LedgerRiskFlag, { label: string; icon: string; tone: string }> = {
  none:                         { label: "None",                    icon: "check_circle",  tone: "green" },
  duplicate:                    { label: "Duplicate",               icon: "content_copy",  tone: "red" },
  unusual_amount:               { label: "Unusual Amount",          icon: "error",         tone: "red" },
  high_frequency:               { label: "High Frequency",          icon: "speed",         tone: "orange" },
  unknown_counterparty:         { label: "Unknown Counterparty",    icon: "help",          tone: "yellow" },
  suspected_capital_injection:  { label: "Capital Injection",       icon: "account_balance",tone: "red" },
  grant_inflow:                 { label: "Grant Inflow",            icon: "volunteer_activism", tone: "orange" },
  bridge_receipt:               { label: "Bridge Receipt",          icon: "swap_horiz",    tone: "yellow" },
  token_distribution:           { label: "Token Distribution",      icon: "token",         tone: "yellow" },
};

const TONE_COLORS: Record<string, string> = {
  red:    "#B85450",
  orange: "#C97B2D",
  yellow: "#A89230",
  green:  "#6DB874",
};

function FlagBadge({ flag }: { flag: LedgerRiskFlag }) {
  const meta = FLAG_META[flag] ?? FLAG_META.unknown_counterparty;
  return (
    <span
      className="stitch-flag-badge"
      style={{ "--flag-color": TONE_COLORS[meta.tone] ?? "#6B6960" } as React.CSSProperties}
    >
      <StitchIcon name={meta.icon} />
      {meta.label}
    </span>
  );
}

type FilterFlag = LedgerRiskFlag | "all" | "open";

export default function FlagsPage() {
  const ledger = useLedgerState();
  const [filter, setFilter] = useState<FilterFlag>("open");
  const [reviewed, setReviewed] = useState<Set<string>>(() => readReviewed());
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);

  const flagged = useMemo(
    () => ledger.transactions.filter((tx) => tx.riskFlag && tx.riskFlag !== "none"),
    [ledger.transactions],
  );

  const rows = useMemo(() => {
    if (filter === "all") return flagged;
    if (filter === "open") return flagged.filter((tx) => !reviewed.has(tx.txHash));
    return flagged.filter((tx) => tx.riskFlag === filter);
  }, [flagged, filter, reviewed]);

  const openCount = flagged.filter((tx) => !reviewed.has(tx.txHash)).length;

  function markReviewed(txHash: string) {
    const next = new Set(reviewed);
    if (next.has(txHash)) {
      next.delete(txHash);
    } else {
      next.add(txHash);
    }
    setReviewed(next);
    writeReviewed(next);
    if (selected?.txHash === txHash) setSelected(null);
  }

  function markAllReviewed() {
    const next = new Set(reviewed);
    rows.forEach((tx) => next.add(tx.txHash));
    setReviewed(next);
    writeReviewed(next);
    setSelected(null);
  }

  const rangeLabels: Record<string, string> = { "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days" };

  return (
    <StitchShell>
      <StitchHeader
        title="Flags"
        description={`Flagged transactions for review · Last ${rangeLabels[ledger.range] ?? ledger.range}`}
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      {/* Summary chips */}
      <div className="stitch-flag-summary">
        <button
          type="button"
          className={`stitch-flag-chip ${filter === "open" ? "active" : ""}`}
          onClick={() => setFilter("open")}
        >
          <StitchIcon name="flag" />
          Open ({openCount})
        </button>
        <button
          type="button"
          className={`stitch-flag-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({flagged.length})
        </button>
        {(["duplicate", "unusual_amount", "high_frequency", "unknown_counterparty"] as LedgerRiskFlag[]).map((f) => {
          const count = flagged.filter((tx) => tx.riskFlag === f).length;
          if (!count) return null;
          return (
            <button
              key={f}
              type="button"
              className={`stitch-flag-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              <StitchIcon name={FLAG_META[f].icon} />
              {FLAG_META[f].label} ({count})
            </button>
          );
        })}
        {openCount > 0 && (
          <button type="button" className="stitch-button" style={{ marginLeft: "auto" }} onClick={markAllReviewed}>
            <StitchIcon name="done_all" /> Mark all reviewed
          </button>
        )}
      </div>

      <section className="stitch-transactions-layout">
        {/* Flag list */}
        <div className="stitch-card">
          {rows.length ? (
            <div className="stitch-flag-list">
              {rows.map((tx) => {
                const isReviewed = reviewed.has(tx.txHash);
                const isSelected = selected?.txHash === tx.txHash;
                return (
                  <div
                    key={tx.txHash}
                    className={`stitch-flag-row ${isReviewed ? "reviewed" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelected(isSelected ? null : tx)}
                  >
                    <span className="stitch-flag-icon">
                      <StitchIcon name={FLAG_META[tx.riskFlag ?? "none"]?.icon ?? "flag"} />
                    </span>
                    <div className="stitch-flag-info">
                      <div className="stitch-flag-top">
                        <FlagBadge flag={tx.riskFlag ?? "none"} />
                        <span className="stitch-flag-amount" style={{ color: tx.direction === "income" ? "var(--st-green)" : "#B85450" }}>
                          {tx.direction === "income" ? "+" : "-"}{formatUsdc(tx.amountUsdc)} USDC
                        </span>
                      </div>
                      <div className="stitch-flag-meta">
                        <span style={{ fontFamily: "var(--st-mono)", fontSize: "11px", color: "var(--st-muted)" }}>
                          {shortenAddress(tx.txHash)}
                        </span>
                        <span>·</span>
                        <span style={{ fontSize: "11px", color: "var(--st-muted)" }}>{relativeTime(tx.timestamp)}</span>
                        <span>·</span>
                        <span style={{ fontFamily: "var(--st-mono)", fontSize: "11px", color: "var(--st-muted)" }}>
                          {shortenAddress(tx.counterparty)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`stitch-flag-review-btn ${isReviewed ? "reviewed" : ""}`}
                      onClick={(e) => { e.stopPropagation(); markReviewed(tx.txHash); }}
                      title={isReviewed ? "Mark as open" : "Mark as reviewed"}
                    >
                      <StitchIcon name={isReviewed ? "undo" : "check"} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <StitchEmpty>
              {!ledger.transactions.length
                ? "Scan a Base wallet from Overview to detect flagged transactions."
                : filter === "open"
                ? "All flagged transactions have been reviewed."
                : "No flagged transactions match this filter."}
            </StitchEmpty>
          )}
        </div>

        {/* Detail panel */}
        <aside className="stitch-card stitch-detail">
          <div className="stitch-card-head">
            <h3>Flag Details</h3>
            {selected && (
              <button
                type="button"
                className="stitch-button"
                style={{ fontSize: "12px", minHeight: "28px", padding: "0 10px" }}
                onClick={() => setSelected(null)}
              >
                <StitchIcon name="close" /> Close
              </button>
            )}
          </div>
          {selected ? (
            <div className="stitch-detail-list">
              <div>
                <span>Flag Type</span>
                <FlagBadge flag={selected.riskFlag ?? "none"} />
              </div>
              <div>
                <span>Direction</span>
                <strong className={selected.direction === "income" ? "income" : "expense"}>
                  {selected.direction === "income" ? "Income" : "Spend"}
                </strong>
              </div>
              <div>
                <span>Amount</span>
                <strong style={{ fontFamily: "var(--st-mono)" }}>{formatUsdc(selected.amountUsdc)} USDC</strong>
              </div>
              <div>
                <span>Counterparty</span>
                <strong style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>{shortenAddress(selected.counterparty)}</strong>
              </div>
              <div>
                <span>Tx Hash</span>
                <strong style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>{shortenAddress(selected.txHash)}</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{relativeTime(selected.timestamp)}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{selected.category ?? "unknown"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong style={{ color: reviewed.has(selected.txHash) ? "var(--st-green)" : "#C97B2D" }}>
                  {reviewed.has(selected.txHash) ? "Reviewed" : "Needs review"}
                </strong>
              </div>
              <div className="stitch-detail-actions">
                <button
                  type="button"
                  className="stitch-button"
                  style={{ width: "100%" }}
                  onClick={() => markReviewed(selected.txHash)}
                >
                  <StitchIcon name={reviewed.has(selected.txHash) ? "undo" : "check"} />
                  {reviewed.has(selected.txHash) ? "Mark as open" : "Mark as reviewed"}
                </button>
                <a
                  href={`https://basescan.org/tx/${selected.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="stitch-basescan-link"
                >
                  <StitchIcon name="open_in_new" /> View on Basescan
                </a>
              </div>
            </div>
          ) : (
            <StitchEmpty compact>Click a flagged transaction to inspect it.</StitchEmpty>
          )}
        </aside>
      </section>
    </StitchShell>
  );
}
