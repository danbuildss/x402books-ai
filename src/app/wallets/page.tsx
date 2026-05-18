"use client";

import { FormEvent } from "react";
import {
  CopyBtn,
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchRange,
  StitchShell,
} from "@/components/stitch-app";
import { formatUsdc, shortenAddress } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function WalletsPage() {
  const ledger = useLedgerState();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  const topCounterparties = ledger.summary.topCounterparties?.slice(0, 8) ?? [];

  return (
    <StitchShell>
      <StitchHeader
        title="Wallets"
        description="Manage and switch between scanned Base wallets."
        actions={<StitchRange value={ledger.range} onChange={ledger.setRange} />}
      />

      <form className="stitch-scanbar stitch-wallet-scan" onSubmit={onSubmit}>
        <label>
          <span>Add Base wallet</span>
          <input
            value={ledger.walletInput}
            onChange={(e) => ledger.setWalletInput(e.target.value)}
            placeholder="0x..."
            style={{ fontFamily: "var(--st-mono)", fontSize: "13px" }}
          />
        </label>
        <button className="stitch-primary" disabled={ledger.isLoading} type="submit">
          {ledger.isLoading ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite" }}>
                <StitchIcon name="sync" />
              </span>
              Scanning…
            </>
          ) : (
            <><StitchIcon name="add" /> Add Wallet</>
          )}
        </button>
        {ledger.error  && <p className="stitch-message error">{ledger.error}</p>}
        {ledger.status && <p className="stitch-message success">{ledger.status}</p>}
      </form>

      <section className="stitch-wallet-list">
        {ledger.recentWallets.length ? (
          ledger.recentWallets.map((wallet, index) => (
            <article className="stitch-wallet-card" key={wallet.address}>
              <div>
                <span><StitchIcon name="account_balance_wallet" /></span>
                <div>
                  <strong>{wallet.label}</strong>
                  <div className="stitch-wallet-address-row">
                    <span title={wallet.address}>{wallet.address}</span>
                    <CopyBtn
                      value={wallet.address}
                      label={`addr-${wallet.address}`}
                      onCopy={ledger.copyText}
                      copied={ledger.copied}
                    />
                    <a
                      href={`https://basescan.org/address/${wallet.address}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View on Basescan"
                      style={{ color: "var(--st-blue)", display: "inline-flex", alignItems: "center" }}
                    >
                      <StitchIcon name="open_in_new" />
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {index === 0 ? (
                  <em>Active</em>
                ) : (
                  <button
                    type="button"
                    className="stitch-button"
                    style={{ fontSize: "12px", minHeight: "30px", padding: "0 10px" }}
                    onClick={() => ledger.scanWallet(wallet.address)}
                  >
                    <StitchIcon name="refresh" /> Switch
                  </button>
                )}
                <button
                  type="button"
                  className="stitch-button"
                  title="Remove wallet"
                  style={{ fontSize: "12px", minHeight: "30px", padding: "0 8px", color: "var(--st-red)", borderColor: "rgba(239,68,68,0.3)" }}
                  onClick={() => ledger.removeRecentWallet(wallet.address)}
                >
                  <StitchIcon name="delete" />
                </button>
              </div>

              <dl>
                <div>
                  <dt>Net Flow</dt>
                  <dd style={{ fontFamily: "var(--st-mono)", color: wallet.balance >= 0 ? "var(--st-green)" : "var(--st-red)" }}>
                    {wallet.balance >= 0 ? "+" : ""}{formatUsdc(wallet.balance)} USDC
                  </dd>
                </div>
                <div>
                  <dt>Transactions</dt>
                  <dd style={{ fontFamily: "var(--st-mono)" }}>{wallet.transactions.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Last Scanned</dt>
                  <dd>{wallet.lastScanned}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <StitchEmpty>Scan a Base wallet to save it here. Up to 5 wallets are remembered.</StitchEmpty>
        )}
      </section>

      {/* Counterparty intelligence */}
      {topCounterparties.length > 0 && (
        <section className="stitch-card">
          <div className="stitch-card-head">
            <h3>Top Counterparties</h3>
            <span style={{ fontSize: "11px", color: "var(--st-muted)" }}>by transaction volume</span>
          </div>
          <div className="stitch-table-wrap">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Tx Count</th>
                  <th>Total USDC</th>
                  <th>Basescan</th>
                </tr>
              </thead>
              <tbody>
                {topCounterparties.map((cp, i) => (
                  <tr key={cp.address}>
                    <td style={{ color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>{i + 1}</td>
                    <td style={{ fontFamily: "var(--st-mono)", fontSize: "12px" }}>
                      <span title={cp.address}>{shortenAddress(cp.address)}</span>
                      <CopyBtn value={cp.address} label={`cp-${cp.address}`} onCopy={ledger.copyText} copied={ledger.copied} />
                    </td>
                    <td style={{ fontFamily: "var(--st-mono)" }}>{cp.count}</td>
                    <td style={{ fontFamily: "var(--st-mono)" }}>{formatUsdc(cp.totalUsdc)} USDC</td>
                    <td>
                      <a
                        href={`https://basescan.org/address/${cp.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="stitch-basescan-link"
                        style={{ fontSize: "11px" }}
                      >
                        <StitchIcon name="open_in_new" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </StitchShell>
  );
}
