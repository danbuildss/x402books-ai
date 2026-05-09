"use client";

import { StitchEmpty, StitchHeader, StitchShell, StitchWalletPill } from "@/components/stitch-app";
import { useLedgerState } from "@/lib/use-ledger-state";

const staticEndpoints = [
  { method: "POST", path: "/api/categorize", note: "Categorize transactions" },
  { method: "GET", path: "/api/health", note: "Check service readiness" },
];

export default function ApiPage() {
  const ledger = useLedgerState();

  return (
    <StitchShell>
      <StitchHeader
        title="API"
        description="Programmatic access to wallet financial data."
        actions={<StitchWalletPill wallet={ledger.wallet} onCopy={() => ledger.copyText(ledger.wallet, "wallet")} />}
      />

      <section className="stitch-api-grid">
        <div className="stitch-card">
          <h3>Your API Key</h3>
          <div className="stitch-code-row">
            <code>API keys unlock in Stage 2</code>
            <button type="button" disabled>Pending</button>
          </div>
          <p>Use the live ledger routes during the private beta. API key management comes next.</p>
        </div>

        <div className="stitch-card">
          <h3>Endpoints</h3>
          {ledger.hasLedger ? (
            <div className="stitch-endpoints">
              {[...ledger.endpoints.map((path) => ({ method: "GET", path, note: "Live wallet endpoint" })), ...staticEndpoints].map((endpoint) => {
                const [basePath, query] = endpoint.path.split("?");
                return (
                  <div key={endpoint.path}>
                    <span>{endpoint.method}</span>
                    <div className="stitch-endpoint-path">
                      <code>{basePath}</code>
                      {query && <small>?{query}</small>}
                    </div>
                    <p>{endpoint.note}</p>
                    <button type="button" onClick={() => ledger.copyText(`${window.location.origin}${endpoint.path}`, endpoint.path)}>
                      {ledger.copied === endpoint.path ? "Copied" : "Copy"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <StitchEmpty compact>Scan a wallet to generate wallet-specific endpoints.</StitchEmpty>
          )}
        </div>

        <div className="stitch-card stitch-api-example">
          <h3>API Documentation</h3>
          <p>Use wallet and range query params to retrieve clean, agent-readable ledger data.</p>
          <pre>{`curl "${typeof window === "undefined" ? "" : window.location.origin}${ledger.endpoints[0]}" \\
  -H "Accept: application/json"`}</pre>
        </div>
      </section>
    </StitchShell>
  );
}

