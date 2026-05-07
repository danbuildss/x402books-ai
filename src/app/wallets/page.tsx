"use client";

import { FormEvent } from "react";
import { StitchEmpty, StitchHeader, StitchShell, StitchIcon } from "@/components/stitch-app";
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
          <input value={ledger.walletInput} onChange={(event) => ledger.setWalletInput(event.target.value)} placeholder="0x..." />
        </label>
        <button className="stitch-primary" disabled={ledger.isLoading} type="submit">
          {ledger.isLoading ? "Scanning..." : "Add Wallet"}
        </button>
        {ledger.error ? <p className="stitch-message error">{ledger.error}</p> : null}
        {ledger.status ? <p className="stitch-message success">{ledger.status}</p> : null}
      </form>

      <section className="stitch-wallet-list">
        {ledger.recentWallets.length ? (
          ledger.recentWallets.map((wallet, index) => (
            <article className="stitch-wallet-card" key={wallet.address}>
              <div>
                <span><StitchIcon name="account_balance_wallet" /></span>
                <div><strong>{wallet.label}</strong><p>{wallet.address}</p></div>
              </div>
              {index === 0 ? <em>Active</em> : <button type="button" onClick={() => ledger.scanWallet(wallet.address)}>Scan</button>}
              <dl>
                <div><dt>Net Flow</dt><dd>${formatUsdc(wallet.balance)}</dd></div>
                <div><dt>Total Transactions</dt><dd>{wallet.transactions.toLocaleString()}</dd></div>
                <div><dt>Last Scanned</dt><dd>{wallet.lastScanned}</dd></div>
              </dl>
            </article>
          ))
        ) : (
          <StitchEmpty>Scan a Base wallet to save it here.</StitchEmpty>
        )}
      </section>
    </StitchShell>
  );
}

