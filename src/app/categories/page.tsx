import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { MiniTrend } from "@/components/product-widgets";
import { appCategories, appSummary, knownCategories } from "@/lib/app-demo-data";
import { formatUsdc } from "@/lib/ledger";

export default function CategoriesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Categories"
        description="AI-categorized breakdown of your activity."
        actions={
          <>
            <WalletSelect />
            <DateFilter />
            <button className="shell-button" type="button">Export CSV</button>
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
            {knownCategories.map((item, index) => {
              const category = appCategories[index];
              const total = category?.totalUsdc || (18.2 - index * 3.1);
              const share = appSummary.totalSpend ? (total / appSummary.totalSpend) * 100 : 0;

              return (
                <tr key={item.key}>
                  <td>
                    <span className={`legend-dot ${item.color}`} />
                    {item.label}
                  </td>
                  <td>${formatUsdc(total)}</td>
                  <td>{share.toFixed(1)}%</td>
                  <td>{category?.count || 12 + index * 7}</td>
                  <td><MiniTrend values={item.trend} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="content-card insight-callout">
        <div>
          <span className="callout-icon">AI</span>
        </div>
        <div>
          <h2>Category Insights</h2>
          <p>
            API calls are your top expense category. Consider optimizing repeated
            model and data requests to reduce per-agent operating cost.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
