"use client";

import { AppShell, PageHeader, WalletSelect } from "@/components/app-shell";
import { useLedgerState } from "@/lib/use-ledger-state";

const staticEndpoints = [
  { method: "POST", path: "/api/categorize", note: "Categorize transactions" },
  { method: "GET", path: "/api/health", note: "Check service readiness" },
];

export default function ApiPage() {
  const ledger = useLedgerState();

  return (
    <AppShell>
      <PageHeader
        title="API"
        description="Programmatic access to wallet financial data."
        actions={<WalletSelect wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />}
      />

      <section className="api-doc-grid">
        <div className="content-card">
          <h2>Your API Key</h2>
          <div className="api-key-box">
            <code>API keys unlock in Stage 2</code>
            <button type="button" disabled>
              Pending
            </button>
          </div>
          <p>Use the live public ledger routes locally while the beta key system is being built.</p>
          <a href="/settings">Manage API preferences</a>
        </div>

        <div className="content-card">
          <h2>Endpoints</h2>
          <div className="endpoint-doc-list">
            {[...ledger.endpoints.map((path) => ({ method: "GET", path, note: "Live wallet endpoint" })), ...staticEndpoints].map((endpoint) => (
              <div key={endpoint.path}>
                <span>{endpoint.method}</span>
                <code>{endpoint.path}</code>
                <p>{endpoint.note}</p>
                <button type="button" onClick={() => ledger.copyText(`${window.location.origin}${endpoint.path}`, endpoint.path)}>
                  {ledger.copied === endpoint.path ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card api-example-card">
          <h2>API Documentation</h2>
          <p>Use wallet and range query params to retrieve clean, agent-readable ledger data.</p>
          <pre>{`curl "${typeof window === "undefined" ? "" : window.location.origin}${ledger.endpoints[0]}" \\
  -H "Accept: application/json"`}</pre>
        </div>
      </section>
    </AppShell>
  );
}
