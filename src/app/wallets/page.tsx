"use client";

import { FormEvent } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function WalletsPage() {
  const ledger = useLedgerState();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ledger.scanWallet();
  }

  return (
    <AppShell>
      <PageHeader title="Wallets" description="Manage and switch between your wallets." />

      <form className="scan-strip wallet-scan" onSubmit={onSubmit}>
        <label>
          <span>Add Base wallet</span>
          <input
            value={ledger.walletInput}
            onChange={(event) => ledger.setWalletInput(event.target.value)}
            placeholder="0x..."
          />
        </label>
        <button className="primary-action" disabled={ledger.isLoading} type="submit">
          {ledger.isLoading ? "Scanning..." : "Add Wallet"}
        </button>
        {ledger.error ? <p className="form-message error">{ledger.error}</p> : null}
        {ledger.status ? <p className="form-message success">{ledger.status}</p> : null}
      </form>

      <section className="wallet-list">
        {ledger.recentWallets.map((wallet, index) => (
          <article className="wallet-card" key={wallet.address}>
            <div>
              <span className="wallet-icon" />
              <div>
                <strong>{wallet.label}</strong>
                <p>{wallet.address}</p>
              </div>
            </div>
            {index === 0 ? <span className="status-good">Active</span> : (
              <button type="button" onClick={() => ledger.scanWallet(wallet.address)}>Scan</button>
            )}
            <dl>
              <div><dt>Net Flow</dt><dd>${formatUsdc(wallet.balance)}</dd></div>
              <div><dt>Total Transactions</dt><dd>{wallet.transactions.toLocaleString()}</dd></div>
              <div><dt>Last Scanned</dt><dd>{wallet.lastScanned}</dd></div>
            </dl>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
