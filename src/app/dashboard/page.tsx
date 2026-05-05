import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import {
  CategoryDonut,
  MetricCard,
  SpendLineChart,
  TransactionsTable,
} from "@/components/product-widgets";
import {
  appCategories,
  appFlows,
  appSummary,
  appTransactions,
  relativeTime,
} from "@/lib/app-demo-data";
import { formatUsdc } from "@/lib/ledger";

export default function DashboardPage() {
  const recent = appTransactions.slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title="Overview"
        description="Financial overview for the selected wallet"
        actions={
          <>
            <WalletSelect />
            <DateFilter />
          </>
        }
      />

      <section className="metrics-grid">
        <MetricCard
          label="Total Spend"
          value={`$${formatUsdc(appSummary.totalSpend)}`}
          delta="down 12.4% vs last 7d"
        />
        <MetricCard
          label="Total Income"
          value={`$${formatUsdc(appSummary.totalIncome)}`}
          delta="up 22.7% vs last 7d"
          tone="green"
        />
        <MetricCard
          label="Net Flow"
          value={`+$${formatUsdc(appSummary.netFlow)}`}
          delta="up 15.3% vs last 7d"
          tone="purple"
        />
        <MetricCard
          label="Transactions"
          value="128"
          delta="up 18.6% vs last 7d"
          tone="cyan"
        />
      </section>

      <section className="overview-grid">
        <SpendLineChart flows={appFlows} />
        <CategoryDonut categories={appCategories} />
      </section>

      <section className="overview-grid lower">
        <div className="content-card wide">
          <div className="card-heading">
            <h2>Recent Transactions</h2>
            <a href="/transactions">View all</a>
          </div>
          <TransactionsTable compact transactions={recent} />
        </div>

        <div className="content-card">
          <div className="card-heading">
            <h2>Activity Feed</h2>
            <a href="/transactions">View all</a>
          </div>
          <div className="activity-list">
            {recent.slice(0, 4).map((transaction) => (
              <div key={transaction.txHash}>
                <span className={transaction.direction === "income" ? "feed-income" : "feed-spend"}>
                  {transaction.direction === "income" ? "↗" : "↘"}
                </span>
                <div>
                  <strong>
                    {transaction.direction === "income" ? "Received" : "Spent"}{" "}
                    {transaction.amountUsdc.toFixed(2)} USDC
                  </strong>
                  <p>From {transaction.counterparty}</p>
                </div>
                <small>{relativeTime(transaction.timestamp)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-strip">
        <div className="cta-icon" />
        <div>
          <h2>Generate clean reports in seconds</h2>
          <p>Export your data as CSV or PDF. Perfect for accounting, audits, and analysis.</p>
        </div>
        <a href="/reports">Generate Report</a>
      </section>
    </AppShell>
  );
}
