import { AppShell, PageHeader } from "@/components/app-shell";
import { appWallets } from "@/lib/app-demo-data";
import { formatUsdc } from "@/lib/ledger";

export default function WalletsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Wallets"
        description="Manage and switch between your wallets."
        actions={<button className="primary-action">Add Wallet</button>}
      />

      <section className="wallet-list">
        {appWallets.map((wallet, index) => (
          <article className="wallet-card" key={wallet.address}>
            <div>
              <span className="wallet-icon" />
              <div>
                <strong>{wallet.label}</strong>
                <p>{wallet.status}</p>
              </div>
            </div>
            {index === 0 ? <span className="status-good">Active</span> : <button type="button">•••</button>}
            <dl>
              <div>
                <dt>Total Balance</dt>
                <dd>${formatUsdc(wallet.balance)}</dd>
              </div>
              <div>
                <dt>Total Transactions</dt>
                <dd>{wallet.transactions.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last Scanned</dt>
                <dd>{wallet.lastScanned}</dd>
              </div>
            </dl>
          </article>
        ))}

        <article className="wallet-card add-wallet-card">
          <span className="wallet-icon add" />
          <div>
            <strong>Add New Wallet</strong>
            <p>Paste a Base wallet address to add</p>
          </div>
          <button type="button">→</button>
        </article>
      </section>
    </AppShell>
  );
}
