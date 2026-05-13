"use client";

import { useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { useLedgerState } from "@/lib/use-ledger-state";

const ECOSYSTEM_TABS = ["All", "BANKR", "VIRTUALS", "Stablecoins"] as const;
type EcosystemTab = (typeof ECOSYSTEM_TABS)[number];

const BANKR_SYMBOLS = new Set(["BNKR", "BANKR"]);
const VIRTUALS_SYMBOLS = new Set([
  "VIRTUAL", "VIRTUALS", "LUNA", "AIXBT", "GAME", "VADER", "CLANKER",
  "SEKOIA", "ACOLYT", "SPORE", "MISATO", "LMAO", "NOOK", "CRED", "XBOOKS", "DEGEN", "MOCA",
]);
const STABLE_SYMBOLS = new Set(["USDC", "USDT", "DAI", "EURC"]);

function matchesTab(symbol: string, tab: EcosystemTab): boolean {
  if (tab === "All") return true;
  if (tab === "BANKR") return BANKR_SYMBOLS.has(symbol);
  if (tab === "VIRTUALS") return VIRTUALS_SYMBOLS.has(symbol);
  if (tab === "Stablecoins") return STABLE_SYMBOLS.has(symbol);
  return true;
}

export default function PortfolioPage() {
  const ledger = useLedgerState();
  const [tab, setTab] = useState<EcosystemTab>("All");

  const filtered = ledger.portfolio.filter((e) => matchesTab(e.tokenSymbol, tab));
  const totalUsdActivity = filtered.reduce((s, e) => s + e.usdInflow + e.usdOutflow, 0);
  const totalUsdNet = filtered.reduce((s, e) => s + e.usdNetFlow, 0);

  return (
    <StitchShell>
      <StitchHeader
        title="Portfolio"
        description="BANKR + VIRTUALS ecosystem token activity"
        actions={
          <>
            <StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <StitchRange value={ledger.range} onChange={ledger.setRange} />
          </>
        }
      />

      {/* Ecosystem tabs */}
      <div className="stitch-ecosystem-tabs">
        {ECOSYSTEM_TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`stitch-ecosystem-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary row */}
      {ledger.hasLedger && filtered.length > 0 && (
        <div className="stitch-portfolio-summary">
          <div className="stitch-portfolio-summary-stat">
            <span>Tokens</span>
            <strong>{filtered.length}</strong>
          </div>
          <div className="stitch-portfolio-summary-stat">
            <span>Total activity</span>
            <strong>${totalUsdActivity.toFixed(2)}</strong>
          </div>
          <div className="stitch-portfolio-summary-stat">
            <span>Net flow</span>
            <strong className={totalUsdNet >= 0 ? "positive" : "negative"}>
              {totalUsdNet >= 0 ? "+" : ""}{totalUsdNet.toFixed(2)} USD
            </strong>
          </div>
        </div>
      )}

      <section className="stitch-card stitch-portfolio">
        {filtered.length ? (
          <div className="stitch-portfolio-list">
            {filtered.map((entry) => (
              <div key={entry.tokenAddress} className="stitch-portfolio-row">
                <div className="stitch-portfolio-token">
                  <span className="stitch-token-symbol">{entry.tokenSymbol}</span>
                  {entry.isAgentToken && <span className="stitch-agent-badge">AGENT</span>}
                  {entry.isStablecoin && <span className="stitch-stable-badge">STABLE</span>}
                </div>
                <div className="stitch-portfolio-meta">
                  {entry.currentPrice != null && entry.currentPrice > 0 && (
                    <span className="stitch-portfolio-price">
                      ${entry.currentPrice < 0.001
                        ? entry.currentPrice.toExponential(2)
                        : entry.currentPrice.toFixed(entry.currentPrice < 1 ? 4 : 2)}
                    </span>
                  )}
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
        ) : (
          <StitchEmpty>
            {ledger.hasLedger
              ? `No ${tab === "All" ? "ecosystem" : tab} token activity in this range.`
              : "Scan a wallet to see portfolio breakdown."}
          </StitchEmpty>
        )}
      </section>
    </StitchShell>
  );
}
