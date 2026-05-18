"use client";

import { useEffect, useState } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchRange,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { useLedgerState } from "@/lib/use-ledger-state";
import type { PortfolioEntry } from "@/lib/ledger";

const ECOSYSTEM_TABS = ["All", "BANKR", "VIRTUALS", "Stablecoins"] as const;
type EcosystemTab = (typeof ECOSYSTEM_TABS)[number];

const BANKR_SYMBOLS = new Set(["BNKR", "BANKR"]);
const VIRTUALS_SYMBOLS = new Set([
  "VIRTUAL", "VIRTUALS", "LUNA", "AIXBT", "GAME", "VADER", "CLANKER",
  "SEKOIA", "ACOLYT", "SPORE", "MISATO", "LMAO", "NOOK", "CRED", "LUCA", "DEGEN", "MOCA",
]);
const STABLE_SYMBOLS = new Set(["USDC", "USDT", "DAI", "EURC"]);

function matchesTab(symbol: string, tab: EcosystemTab): boolean {
  if (tab === "All") return true;
  if (tab === "BANKR") return BANKR_SYMBOLS.has(symbol);
  if (tab === "VIRTUALS") return VIRTUALS_SYMBOLS.has(symbol);
  if (tab === "Stablecoins") return STABLE_SYMBOLS.has(symbol);
  return true;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

type PricePoint = { ts: number; price: number };

function Sparkline({ address }: { address: string }) {
  const [data, setData] = useState<PricePoint[]>([]);

  useEffect(() => {
    if (!address.startsWith("0x")) return;
    fetch(`/api/token/chart?address=${address}`)
      .then((r) => r.json())
      .then((d: { prices?: PricePoint[] }) => setData(d.prices ?? []))
      .catch(() => {});
  }, [address]);

  if (data.length < 4) {
    return <span className="stitch-sparkline-empty">—</span>;
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 80, H = 28;

  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * W;
      const y = H - ((p - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "var(--st-green)" : "var(--st-red)";

  return (
    <svg width={W} height={H} className="stitch-sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Price change badge ────────────────────────────────────────────────────────

function PriceChangeBadge({ change }: { change?: number }) {
  if (change == null) return null;
  const pos = change >= 0;
  return (
    <span className={`stitch-price-change ${pos ? "up" : "down"}`}>
      {pos ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
    </span>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function PortfolioRow({ entry }: { entry: PortfolioEntry }) {
  const formatPrice = (p: number) =>
    p < 0.0001
      ? p.toExponential(2)
      : p < 1
      ? `$${p.toFixed(4)}`
      : `$${p.toFixed(2)}`;

  return (
    <div className="stitch-portfolio-row stitch-portfolio-row-rich">
      {/* Token */}
      <div className="stitch-portfolio-token">
        <span className="stitch-token-symbol">{entry.tokenSymbol}</span>
        {entry.isAgentToken && <span className="stitch-agent-badge">AGENT</span>}
        {entry.isStablecoin && <span className="stitch-stable-badge">STABLE</span>}
      </div>

      {/* Price + 24h change */}
      <div className="stitch-portfolio-price-col">
        {entry.currentPrice != null && entry.currentPrice > 0 ? (
          <>
            <span className="stitch-portfolio-price">{formatPrice(entry.currentPrice)}</span>
            <PriceChangeBadge change={entry.priceChange24h} />
          </>
        ) : (
          <span className="stitch-portfolio-price" style={{ color: "var(--st-muted)" }}>—</span>
        )}
      </div>

      {/* Sparkline */}
      <div className="stitch-portfolio-chart-col">
        {entry.isStablecoin ? (
          <span className="stitch-sparkline-empty">Stable</span>
        ) : (
          <Sparkline address={entry.tokenAddress} />
        )}
      </div>

      {/* Flows */}
      <div className="stitch-portfolio-flows">
        <span className="stitch-portfolio-inflow">+${entry.usdInflow.toFixed(2)}</span>
        <span className="stitch-portfolio-outflow">-${entry.usdOutflow.toFixed(2)}</span>
      </div>

      {/* Net */}
      <span className={`stitch-portfolio-net ${entry.usdNetFlow >= 0 ? "positive" : "negative"}`}>
        {entry.usdNetFlow >= 0 ? "+" : ""}{entry.usdNetFlow.toFixed(2)} USD
      </span>

      {/* Tx count */}
      <span className="stitch-portfolio-txcount">{entry.txCount} tx</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

      {/* Column headers */}
      {ledger.hasLedger && filtered.length > 0 && (
        <div className="stitch-portfolio-header-row">
          <span>Token</span>
          <span>Price · 24h</span>
          <span>7d chart</span>
          <span>Inflow / Outflow</span>
          <span>Net flow</span>
          <span>Txns</span>
        </div>
      )}

      <section className="stitch-card stitch-portfolio">
        {filtered.length ? (
          <div className="stitch-portfolio-list">
            {filtered.map((entry) => (
              <PortfolioRow key={entry.tokenAddress} entry={entry} />
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
