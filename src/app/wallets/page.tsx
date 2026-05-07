"use client";

import { FormEvent } from "react";
import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchShell,
} from "@/components/stitch-app";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function WalletsPage() {
  const ledger = useLedgerState();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <StitchShell>
      <StitchHeader
        title="Wallets"
        description="Add and manage Base wallets for automated ledger tracking."
      />

      {/* ---- Top stats ---- */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        {[
          {
            label: "Total Consolidated Balance",
            value: `$${formatUsdc(
              ledger.recentWallets.reduce((s, w) => s + w.balance, 0),
            )} USDC`,
            sub: null,
          },
          {
            label: "Active Wallets",
            value: String(ledger.recentWallets.length || 0),
            sub: ledger.recentWallets.length ? "All networks operational" : "No wallets added",
          },
          {
            label: "Base Network Status",
            value: "L2 Optimized",
            sub: `Synced to block #—`,
          },
        ].map((card) => (
          <div key={card.label} className="stitch-card">
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 6px" }}>
              {card.label}
            </p>
            <p style={{ fontSize: "20px", fontWeight: 600, color: "var(--s-ink)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              {card.value}
            </p>
            {card.sub && (
              <p style={{ fontSize: "12px", color: "var(--s-primary)", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>check_circle</span>
                {card.sub}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ---- Wallet grid ---- */}
      <section className="stitch-wallet-list">
        {ledger.recentWallets.map((wallet, index) => (
          <article key={wallet.address} className="stitch-wallet-card">
            <div className="stitch-wallet-card-top">
              <div className="stitch-wallet-card-id">
                <div className="stitch-wallet-badge">
                  <StitchIcon name="account_balance_wallet" />
                </div>
                <div className="stitch-wallet-label">
                  <strong>{wallet.label}</strong>
                  <span>{wallet.address}</span>
                </div>
              </div>
              {index === 0 ? (
                <span className="stitch-active-badge">Active</span>
              ) : (
                <button
                  className="stitch-button"
                  type="button"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => ledger.scanWallet(wallet.address)}
                >
                  <StitchIcon name="refresh" /> Scan
                </button>
              )}
            </div>

            <dl className="stitch-wallet-stats">
              <div>
                <dt>Net Flow</dt>
                <dd style={{ color: wallet.balance >= 0 ? "var(--s-primary)" : "var(--s-negative)" }}>
                  {wallet.balance >= 0 ? "+" : ""}${formatUsdc(wallet.balance)}
                </dd>
              </div>
              <div>
                <dt>Transactions</dt>
                <dd>{wallet.transactions.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last Scanned</dt>
                <dd style={{ fontSize: "12px" }}>{wallet.lastScanned}</dd>
              </div>
            </dl>
          </article>
        ))}

        {/* ---- Add wallet card ---- */}
        <article className="stitch-wallet-card" style={{ borderStyle: "dashed" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div className="stitch-wallet-badge" style={{ background: "rgba(156,166,159,0.08)" }}>
              <StitchIcon name="add" />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--s-ink)", margin: "0 0 2px" }}>
                Add New Wallet
              </p>
              <p style={{ fontSize: "12px", color: "var(--s-muted)", margin: 0 }}>
                Import a Base address to begin ledger tracking.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              className="stitch-scanbar"
              style={{ padding: "8px 12px", fontFamily: "ui-monospace, monospace", fontSize: "12px", background: "var(--s-surface-hover)", border: "1px solid var(--s-border)", borderRadius: "6px", color: "var(--s-ink)", outline: "none", width: "100%" }}
              value={ledger.walletInput}
              onChange={(e) => ledger.setWalletInput(e.target.value)}
              placeholder="0x wallet address…"
              spellCheck={false}
            />
            <button
              className="stitch-primary"
              type="submit"
              disabled={ledger.isLoading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {ledger.isLoading ? (
                <><StitchIcon name="sync" /> Scanning…</>
              ) : (
                <><StitchIcon name="add" /> Register Asset</>
              )}
            </button>
            {ledger.error  && <p className="stitch-message error">{ledger.error}</p>}
            {ledger.status && <p className="stitch-message success">{ledger.status}</p>}
          </form>
        </article>

        {!ledger.recentWallets.length && (
          <div style={{ gridColumn: "1 / -1" }}>
            <StitchEmpty>No wallets tracked yet. Add a Base address above to get started.</StitchEmpty>
          </div>
        )}
      </section>

      {/* ---- Feature strip ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        {[
          { icon: "lock",         title: "End-to-End Encrypted",   sub: "Private keys never touch our servers." },
          { icon: "verified",     title: "Base L2 Verified",       sub: "Real-time RPC indexing." },
          { icon: "download",     title: "Export Ready",           sub: "CSV/JSON exports available." },
          { icon: "history",      title: "Auditable History",      sub: "Immutable ledger snapshots." },
        ].map((item) => (
          <div key={item.title} className="stitch-card" style={{ padding: "16px 18px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--s-primary)", display: "block", marginBottom: "8px", fontVariationSettings: "'FILL' 1" }}>
              {item.icon}
            </span>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--s-ink)", margin: "0 0 3px" }}>{item.title}</p>
            <p style={{ fontSize: "11px", color: "var(--s-muted)", margin: 0 }}>{item.sub}</p>
          </div>
        ))}
      </div>
    </StitchShell>
  );
}
