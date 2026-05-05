import { AppShell, PageHeader } from "@/components/app-shell";

const endpoints = [
  { method: "GET", path: "/api/ledger/summary", note: "Get wallet summary" },
  { method: "GET", path: "/api/ledger/transactions", note: "List all transactions" },
  { method: "GET", path: "/api/ledger/report", note: "Generate report" },
  { method: "POST", path: "/api/categorize", note: "Categorize transactions" },
];

export default function ApiPage() {
  return (
    <AppShell>
      <PageHeader
        title="API"
        description="Programmatic access to wallet financial data."
        actions={<button className="primary-action">Create Key</button>}
      />

      <section className="api-doc-grid">
        <div className="content-card">
          <h2>Your API Key</h2>
          <div className="api-key-box">
            <code>x402bk_live_••••••••••••••••••••••••••••</code>
            <button type="button">Copy</button>
          </div>
          <p>Created on May 10, 2026</p>
          <a href="/settings">Rotate key</a>
        </div>

        <div className="content-card">
          <h2>Endpoints</h2>
          <div className="endpoint-doc-list">
            {endpoints.map((endpoint) => (
              <div key={endpoint.path}>
                <span>{endpoint.method}</span>
                <code>{endpoint.path}</code>
                <p>{endpoint.note}</p>
                <button type="button">Copy</button>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card api-example-card">
          <h2>API Documentation</h2>
          <p>Use wallet and range query params to retrieve clean, agent-readable ledger data.</p>
          <pre>{`curl "https://x402books.ai/api/ledger/summary?wallet=0x...&range=30d" \\
  -H "Authorization: Bearer x402bk_live_..."`}</pre>
        </div>
      </section>
    </AppShell>
  );
}
