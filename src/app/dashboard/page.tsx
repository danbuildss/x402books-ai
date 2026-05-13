"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  StitchAiSummary,
  StitchDonut,
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchLineChart,
  StitchRange,
  StitchScanBar,
  StitchShell,
  StitchStat,
  StitchTransactionsTable,
  StitchWalletPill,
} from "@/components/stitch-app";
import { formatUsdc, relativeTime, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";
import type { AgentResult } from "@/lib/agent-search";

const RANGE_LABELS: Record<string, string> = {
  "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days",
};

function AgentSearch({ onSelect }: { onSelect: (address: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/search?q=${encodeURIComponent(query)}`);
        const data = await res.json() as { results: AgentResult[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch { /* silent */ } finally { setLoading(false); }
    }, 380);
  }, [query]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function pick(agent: AgentResult) {
    const addr = agent.walletAddress || agent.tokenAddress;
    onSelect(addr);
    setQuery(agent.name || agent.symbol);
    setOpen(false);
  }

  return (
    <div className="stitch-agent-search" ref={wrapRef}>
      <div className="stitch-agent-search-bar">
        <span className="material-symbols-outlined" style={{ fontSize: 17, color: "var(--st-muted)" }}>
          manage_search
        </span>
        <input
          className="stitch-agent-search-input"
          placeholder="Search agent name, symbol or @handle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {loading && <span className="stitch-agent-spinner" />}
      </div>

      {open && results.length > 0 && (
        <div className="stitch-agent-results">
          {results.map((agent, i) => (
            <button key={i} type="button" className="stitch-agent-result" onClick={() => pick(agent)}>
              {agent.imageUrl && (
                <img src={agent.imageUrl} alt="" className="stitch-agent-img" />
              )}
              <div className="stitch-agent-info">
                <span className="stitch-agent-name">{agent.name}</span>
                <span className="stitch-agent-sym">
                  {agent.symbol}
                  {agent.xHandle && (
                    <span style={{ color: "var(--st-muted)", marginLeft: 4 }}>
                      · @{agent.xHandle.replace(/^@/, "")}
                    </span>
                  )}
                </span>
              </div>
              <span className={`stitch-ecosystem-badge ${agent.ecosystem.toLowerCase()}`}>
                {agent.ecosystem}
              </span>
              <div className="stitch-agent-addr-wrap">
                {agent.walletAddress ? (
                  <span className="stitch-agent-addr-pill wallet">
                    Wallet · {agent.walletAddress.slice(0, 6)}…{agent.walletAddress.slice(-4)}
                  </span>
                ) : (
                  <span className="stitch-agent-addr-pill token">
                    Token contract
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="stitch-agent-results">
          <div className="stitch-agent-empty">No agents found for &quot;{query}&quot;</div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const ledger = useLedgerState();
  const [mode, setMode] = useState<"wallet" | "agent">("wallet");
  const recent = ledger.transactions.slice(0, 6);
  const hasWallet = Boolean(ledger.wallet);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <StitchShell>
      <StitchHeader
        title="Overview"
        description={`Financial overview · Last ${RANGE_LABELS[ledger.range] ?? ledger.range}`}
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      {/* Mode toggle */}
      <div className="stitch-mode-tabs">
        <button
          type="button"
          className={`stitch-mode-tab${mode === "wallet" ? " active" : ""}`}
          onClick={() => setMode("wallet")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>account_balance_wallet</span>
          Wallet
        </button>
        <button
          type="button"
          className={`stitch-mode-tab${mode === "agent" ? " active" : ""}`}
          onClick={() => setMode("agent")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>smart_toy</span>
          Find Agent
        </button>
      </div>

      {mode === "wallet" ? (
        <StitchScanBar
          value={ledger.walletInput}
          onChange={ledger.setWalletInput}
          onSubmit={onSubmit}
          onCategorize={ledger.categorizeTransactions}
          onExport={ledger.exportCsv}
          onExportPdf={ledger.exportPdf}
          loading={ledger.isLoading}
          categorizing={ledger.isCategorizing}
          error={ledger.error}
          status={ledger.status}
          hasTransactions={ledger.transactions.length > 0}
        />
      ) : (
        <AgentSearch
          onSelect={(addr) => {
            ledger.setWalletInput(addr);
            setMode("wallet");
            ledger.scanWallet(addr, ledger.range);
          }}
        />
      )}

      {!hasWallet && !ledger.isLoading && (
        <div className="stitch-onboard">
          <div className="stitch-onboard-icon">
            <StitchIcon name="account_balance_wallet" />
          </div>
          <h2>Connect your Base wallet to get started.</h2>
          <p>
            Paste any Base wallet address above and hit Scan to see your USDC activity,
            AI-generated insights, category breakdowns, and exportable reports.
          </p>
          <div className="stitch-onboard-steps">
            <span className="stitch-onboard-step"><strong>1</strong> Paste wallet address</span>
            <span className="stitch-onboard-step"><strong>2</strong> Hit Scan Wallet</span>
            <span className="stitch-onboard-step"><strong>3</strong> Get your report</span>
          </div>
        </div>
      )}

      <section className="stitch-stats-grid">
        <StitchStat
          label="Total Spend"
          value={`$${formatUsdc(ledger.summary.totalSpend)}`}
          usd="USD equivalent across all tokens"
          helper="Base ERC-20 outflow"
          icon="south_east"
          tone="red"
        />
        <StitchStat
          label="Total Income"
          value={`$${formatUsdc(ledger.summary.totalIncome)}`}
          usd="USD equivalent across all tokens"
          helper="Base ERC-20 inflow"
          icon="north_east"
        />
        <StitchStat
          label="Net Flow"
          value={`${ledger.summary.netFlow >= 0 ? "+" : "-"}$${formatUsdc(Math.abs(ledger.summary.netFlow))}`}
          usd="USD net across all tokens"
          helper={ledger.report.budgetStatus}
          icon="monitoring"
        />
        <StitchStat
          label="Transactions"
          value={String(ledger.summary.transactionCount)}
          helper={`${ledger.summary.likelyX402Count} likely x402`}
          icon="receipt_long"
          tone="blue"
        />
      </section>

      {/* Portfolio breakdown — top 5 */}
      {ledger.hasLedger && ledger.portfolio.length > 0 && (
        <section className="stitch-card stitch-portfolio">
          <div className="stitch-card-head">
            <h3>Portfolio</h3>
            <a href="/portfolio">View all →</a>
          </div>
          <div className="stitch-portfolio-list">
            {ledger.portfolio.slice(0, 5).map((entry) => (
              <div key={entry.tokenAddress} className="stitch-portfolio-row">
                <div className="stitch-portfolio-token">
                  <span className="stitch-token-symbol">{entry.tokenSymbol}</span>
                  {entry.isAgentToken && <span className="stitch-agent-badge">AGENT</span>}
                </div>
                <div className="stitch-portfolio-flows">
                  <span className="stitch-portfolio-inflow">+${entry.usdInflow.toFixed(2)}</span>
                  <span className="stitch-portfolio-outflow">-${entry.usdOutflow.toFixed(2)}</span>
                </div>
                <span className={`stitch-portfolio-net ${entry.usdNetFlow >= 0 ? "positive" : "negative"}`}>
                  {entry.usdNetFlow >= 0 ? "+" : ""}{entry.usdNetFlow.toFixed(2)} USD
                </span>
                <span className="stitch-portfolio-txcount">{entry.txCount} tx</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasWallet && (
        <StitchAiSummary
          summary={ledger.aiSummary}
          isLoading={ledger.isGeneratingSummary}
          onRefresh={ledger.generateAiSummary}
        />
      )}

      <section className="stitch-two-grid">
        <StitchLineChart flows={ledger.dailyFlows} />
        <StitchDonut categories={ledger.categories} />
      </section>

      <section className="stitch-lower-grid">
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Recent Transactions</h3>
            <a href="/transactions">View all</a>
          </div>
          {recent.length ? (
            <StitchTransactionsTable compact transactions={recent} />
          ) : (
            <StitchEmpty compact>Scan a wallet to see recent USDC transfers.</StitchEmpty>
          )}
        </div>

        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Activity Feed</h3>
            <a href="/transactions">View all</a>
          </div>
          {recent.length ? (
            <div className="stitch-feed">
              {recent.slice(0, 5).map((transaction) => (
                <div key={transaction.txHash}>
                  <span className={transaction.direction === "income" ? "income" : "expense"}>
                    {transaction.direction === "income" ? "north_east" : "south_east"}
                  </span>
                  <div>
                    <strong>
                      {transaction.direction === "income" ? "Received" : "Spent"} {formatUsdc(transaction.amountUsdc)} USDC
                    </strong>
                    <p>{shortenAddress(transaction.counterparty)}</p>
                  </div>
                  <small>{relativeTime(transaction.timestamp)}</small>
                </div>
              ))}
            </div>
          ) : (
            <StitchEmpty compact>Wallet activity will appear here.</StitchEmpty>
          )}
        </div>
      </section>
    </StitchShell>
  );
}
