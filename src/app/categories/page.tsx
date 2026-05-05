"use client";

import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { MiniTrend } from "@/components/product-widgets";
import { knownCategories } from "@/lib/app-demo-data";
import { formatUsdc } from "@/lib/ledger";
import { useLedgerState } from "@/lib/use-ledger-state";

export default function CategoriesPage() {
  const ledger = useLedgerState();

  return (
    <AppShell>
      <PageHeader
        title="Categories"
        description="AI-categorized breakdown of your activity."
        actions={
          <>
            <WalletSelect wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />
            <DateFilter range={ledger.range} onChange={ledger.setRange} />
            <button className="shell-button" type="button" onClick={ledger.exportCsv}>Export CSV</button>
          </>
        }
      />

      <section className="content-card">
        <table className="product-table category-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Amount</th>
              <th>% of Spend</th>
              <th>Transactions</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {ledger.categories.map((category, index) => {
              const trend = knownCategories[index]?.trend || [2, 4, 3, 7, 6, 8];
              const share = ledger.summary.totalSpend
                ? (category.totalUsdc / ledger.summary.totalSpend) * 100
                : 0;

              return (
                <tr key={category.category}>
                  <td>
                    <span className={`legend-dot ${knownCategories[index]?.color || "green"}`} />
                    {category.label}
                  </td>
                  <td>${formatUsdc(category.totalUsdc)}</td>
                  <td>{share.toFixed(1)}%</td>
                  <td>{category.count}</td>
                  <td><MiniTrend values={trend} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="content-card insight-callout">
        <div><span className="callout-icon">AI</span></div>
        <div>
          <h2>Category Insights</h2>
          <p>{ledger.report.narrative}</p>
        </div>
      </section>
    </AppShell>
  );
}
