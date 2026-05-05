import { AppShell, DateFilter, PageHeader, WalletSelect } from "@/components/app-shell";
import { appCategories, appSummary, appTransactions } from "@/lib/app-demo-data";
import { formatUsdc, shortenAddress } from "@/lib/ledger";

export default function ReportsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Generate and export clean financial reports."
        actions={<button className="primary-action">New Report</button>}
      />

      <section className="reports-grid">
        <div className="content-card">
          <h2>Generate Report</h2>
          <label>
            <span>Wallet</span>
            <select defaultValue="0xA1b2...C3d4">
              <option>0xA1b2...C3d4</option>
              <option>0xDaE5...F6g7</option>
            </select>
          </label>
          <label>
            <span>Date Range</span>
            <div className="date-range">
              <input defaultValue="May 12, 2026" />
              <input defaultValue="May 18, 2026" />
            </div>
          </label>
          <label>
            <span>Report Type</span>
            <select defaultValue="Summary Report">
              <option>Summary Report</option>
              <option>Detailed Transactions</option>
              <option>Income Report</option>
            </select>
          </label>
          <div className="radio-row">
            <label><input defaultChecked name="format" type="radio" /> CSV</label>
            <label><input name="format" type="radio" /> PDF</label>
          </div>
          <button className="primary-action full-width" type="button">Generate Report</button>
        </div>

        <div className="content-card">
          <h2>Recent Reports</h2>
          {["Summary Report", "Spending by Category", "Income Report", "Detailed Transactions"].map((name, index) => (
            <div className="report-row" key={name}>
              <div>
                <strong>{name}</strong>
                <p>May {18 - index}, 2026 · CSV</p>
              </div>
              <button type="button">Download</button>
            </div>
          ))}
          <a href="/report">View all reports</a>
        </div>
      </section>

      <section className="content-card report-preview-card">
        <div className="card-heading">
          <h2>Report Preview</h2>
          <DateFilter />
        </div>
        <div className="report-preview-grid">
          <div><span>Total Spend</span><strong>${formatUsdc(appSummary.totalSpend)}</strong></div>
          <div><span>Total Income</span><strong>${formatUsdc(appSummary.totalIncome)}</strong></div>
          <div><span>Net Flow</span><strong>+${formatUsdc(appSummary.netFlow)}</strong></div>
          <div><span>Transactions</span><strong>{appTransactions.length}</strong></div>
          <div><span>Top Category</span><strong>{appCategories[0]?.label || "API Calls"}</strong></div>
          <div><span>Top Counterparty</span><strong>{shortenAddress(appTransactions[0].counterparty)}</strong></div>
        </div>
      </section>
    </AppShell>
  );
}
