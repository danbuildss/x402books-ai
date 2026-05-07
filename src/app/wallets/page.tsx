"use client";

import { FormEvent } from "react";
import { CopyBtn, StitchEmpty, StitchHeader, StitchIcon, StitchShell } from "@/components/stitch-app";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function WalletsPage() {
  const ledger = useLedgerState();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <StitchShell>
      <StitchHeader title="Wallets" description="Manage and switch between scanned Base wallets." />

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
                  {/* Address row with inline copy + Basescan */}
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

              {index === 0 ? (
                <em>Active</em>
              ) : (
                <button
                  type="button"
                  className="stitch-button"
                  style={{ fontSize: "12px", minHeight: "30px", padding: "0 10px" }}
                  onClick={() => ledger.scanWallet(wallet.address)}
                >
                  <StitchIcon name="refresh" /> Rescan
                </button>
              )}

              <dl>
                <div>
                  <dt>Net Flow</dt>
                  <dd style={{
                    fontFamily: "var(--st-mono)",
                    color: wallet.balance >= 0 ? "var(--st-green)" : "var(--st-red)",
                  }}>
                    {wallet.balance >= 0 ? "+" : ""}${formatUsdc(wallet.balance)}
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
    </StitchShell>
  );
}
