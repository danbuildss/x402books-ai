"use client";

import { formatCategory, formatUsdc, shortenAddress } from "@/lib/ledger";
import { relativeTime, signedAmount } from "@/lib/app-demo-data";
import type { CategorySummary, DailyFlow, LedgerTransaction } from "@/lib/ledger";

export function MetricCard({
  label,
  value,
  delta,
  tone = "blue",
}: {
  label: string;
  value: string;
  delta: string;
  tone?: "blue" | "green" | "purple" | "cyan";
}) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={`tone-${tone}`}>{delta}</small>
      </div>
      <i className={`metric-icon tone-${tone}`} />
    </article>
  );
}

export function SpendLineChart({ flows }: { flows: DailyFlow[] }) {
  const max = Math.max(1, ...flows.map((flow) => flow.spend));
  const points = flows
    .map((flow, index) => {
      const x = flows.length === 1 ? 0 : (index / (flows.length - 1)) * 640;
      const y = 220 - (flow.spend / max) * 200;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-card large">
      <div className="card-heading">
        <h2>Spend Over Time</h2>
        <button type="button">Last 7 days</button>
      </div>
      <svg className="product-line-chart" viewBox="0 0 640 240" preserveAspectRatio="none">
        <g>
          {[0, 1, 2, 3].map((line) => (
            <line key={line} x1="0" x2="640" y1={40 + line * 54} y2={40 + line * 54} />
          ))}
        </g>
        <polyline points={points} />
        {flows.map((flow, index) => {
          const x = flows.length === 1 ? 0 : (index / (flows.length - 1)) * 640;
          const y = 220 - (flow.spend / max) * 200;
          return <circle cx={x} cy={y} key={flow.date} r="5" />;
        })}
      </svg>
      <div className="chart-axis">
        {flows.map((flow) => (
          <span key={flow.date}>
            {new Date(`${flow.date}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryDonut({ categories }: { categories: CategorySummary[] }) {
  const rows = categories.slice(0, 5);

  return (
    <div className="chart-card">
      <div className="card-heading">
        <h2>Top Categories</h2>
        <button type="button">By Spend</button>
      </div>
      <div className="donut-layout">
        <div className="donut-chart" />
        <div className="donut-legend">
          {rows.map((category, index) => (
            <div key={category.category}>
              <span className={`legend-dot dot-${index}`} />
              <strong>{category.label}</strong>
              <small>{formatUsdc(category.totalUsdc)}</small>
              <em>{Math.max(6, Math.round(42 - index * 8))}%</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TransactionsTable({
  transactions,
  onSelect,
  compact = false,
}: {
  transactions: LedgerTransaction[];
  onSelect?: (transaction: LedgerTransaction) => void;
  compact?: boolean;
}) {
  return (
    <div className="table-card">
      <table className="product-table">
        <thead>
          <tr>
            {!compact ? <th>Tx Hash</th> : null}
            <th>Type</th>
            <th>Category</th>
            <th>Counterparty</th>
            <th>Amount</th>
            <th>{compact ? "Time" : "Timestamp"}</th>
            {!compact ? <th>AI Confidence</th> : null}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr
              key={transaction.txHash}
              onClick={() => onSelect?.(transaction)}
              tabIndex={onSelect ? 0 : undefined}
            >
              {!compact ? <td>{shortenAddress(transaction.txHash)}</td> : null}
              <td className={transaction.direction === "income" ? "income-text" : "spend-text"}>
                {transaction.direction === "income" ? "Income" : "Spend"}
              </td>
              <td>
                <span className={`category-pill ${transaction.category || "unknown"}`}>
                  {formatCategory(transaction.category || "unknown")}
                </span>
              </td>
              <td>{transaction.counterparty}</td>
              <td className={transaction.direction === "income" ? "income-text" : "spend-text"}>
                {signedAmount(transaction)}
              </td>
              <td>{relativeTime(transaction.timestamp)}</td>
              {!compact ? <td>{transaction.confidenceScore || 72}%</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MiniTrend({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 110;
      const y = 36 - (value / max) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-trend" viewBox="0 0 110 40" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}
