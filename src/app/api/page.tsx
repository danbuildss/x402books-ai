"use client";

import {
  StitchEmpty,
  StitchHeader,
  StitchIcon,
  StitchShell,
  StitchWalletPill,
} from "@/components/stitch-app";
import { useLedgerState } from "@/lib/use-ledger-state";

const STATIC_ENDPOINTS = [
  { method: "GET",  path: "/api/stats",                          note: "Live adoption metrics + market resolution" },
  { method: "GET",  path: "/api/badge/[slug]",                   note: "SVG verification badge (embed in README)" },
  { method: "GET",  path: "/api/registry/agents",                note: "All indexed agents with verification status" },
  { method: "POST", path: "/api/registry/fetch-manifest",        note: "Submit .agent/wallets.json from repo" },
  { method: "POST", path: "/api/registry/claim",                 note: "Claim agent profile with wallet address" },
  { method: "GET",  path: "/api/v1/agent-financial-state",       note: "Treasury health for any wallet (API key)" },
  { method: "GET",  path: "/api/v1/agent-report",                note: "Financial intelligence report (API key)" },
  { method: "GET",  path: "/api/health",                         note: "Service health check" },
];

const CODE_TABS = ["Node.js", "Python"] as const;
type CodeTab = (typeof CODE_TABS)[number];

const CODE_SAMPLES: Record<CodeTab, string> = {
  "Node.js": `// Fetch live registry stats (no auth)
const res = await fetch('https://www.x402books.xyz/api/stats');
const stats = await res.json();
console.log(stats.agents_indexed);      // 125
console.log(stats.wallets_declared_or_above); // 15

// Fetch treasury health (API key)
const state = await fetch(
  'https://www.x402books.xyz/api/v1/agent-financial-state?wallet=0x...&range=30d',
  { headers: { 'Authorization': 'Bearer xb_live_...' } }
);
const data = await state.json();
console.log(data.financial_health.budget_status);`,
  Python: `import requests

# Fetch live registry stats (no auth)
stats = requests.get('https://www.x402books.xyz/api/stats').json()
print(stats['agents_indexed'])          # 125
print(stats['wallets_declared_or_above']) # 15

# Fetch treasury health (API key)
state = requests.get(
    'https://www.x402books.xyz/api/v1/agent-financial-state',
    params={'wallet': '0x...', 'range': '30d'},
    headers={'Authorization': 'Bearer xb_live_...'}
).json()
print(state['financial_health']['budget_status'])`,
};

import { useState } from "react";

export default function ApiPage() {
  const ledger = useLedgerState();
  const [codeTab, setCodeTab] = useState<CodeTab>("Node.js");

  const liveEndpoints = ledger.endpoints.map((path) => ({
    method: "GET",
    path,
    note: "Live wallet endpoint",
  }));

  const allEndpoints = [...liveEndpoints, ...STATIC_ENDPOINTS];

  return (
    <StitchShell>
      <StitchHeader
        title="API"
        description="Programmatic access to agent financial identity data — registry, verification, treasury intelligence."
        actions={
          <StitchWalletPill
            wallet={ledger.wallet}
            onCopy={() => ledger.copyText(ledger.wallet, "wallet")}
          />
        }
      />

      {/* ---- Hero banner ---- */}
      <div className="stitch-card" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 4px" }}>
              Developer Portal
            </p>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--s-ink)", margin: "0 0 6px" }}>
              Build with Zetta Intelligence
            </h3>
            <p style={{ fontSize: "13px", color: "var(--s-muted)", margin: "0 0 16px", maxWidth: "480px", lineHeight: "1.6" }}>
              Build on the financial identity layer for autonomous agents. Query the registry, verify agent wallets, access real-time treasury intelligence, and resolve prediction markets — all via a clean REST API. Public endpoints are free and require no auth.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href="https://github.com/danbuildss/x402books-ai"
                target="_blank"
                rel="noreferrer"
                className="stitch-primary"
              >
                <StitchIcon name="menu_book" /> Read Docs
              </a>
              <button className="stitch-button" type="button">
                <StitchIcon name="support_agent" /> Support
              </button>
            </div>
          </div>
          <div style={{ padding: "8px 14px", background: "rgba(71,199,139,0.08)", border: "1px solid rgba(71,199,139,0.2)", borderRadius: "8px", textAlign: "center", flexShrink: 0 }}>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--s-muted)", margin: "0 0 4px" }}>Global Node Status</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--s-primary)", margin: "0 0 2px" }}>99.89%</p>
            <p style={{ fontSize: "11px", color: "var(--s-muted)", margin: 0 }}>Uptime</p>
          </div>
        </div>
      </div>

      <section className="stitch-api-grid">
        {/* ---- API Key ---- */}
        <div className="stitch-card">
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--s-ink)", margin: "0 0 4px" }}>
            Your API Key
          </h3>
          <p style={{ fontSize: "12px", color: "var(--s-muted)", margin: "0 0 2px" }}>Primary Production Key</p>

          <div className="stitch-api-key-row">
            <code>xbl_live_••••••••••••••••••••••••••••••••••••</code>
            <button className="stitch-icon-btn" type="button" aria-label="Copy key">
              <StitchIcon name="content_copy" />
            </button>
            <button className="stitch-icon-btn" type="button" aria-label="Toggle visibility">
              <StitchIcon name="visibility_off" />
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="stitch-button" type="button" style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}>
              Revoke
            </button>
            <button className="stitch-button" type="button" style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}>
              Roll Key
            </button>
          </div>

          <p style={{ fontSize: "11px", color: "var(--s-muted)", marginTop: "10px", marginBottom: 0, lineHeight: "1.5" }}>
            API key management activates in Stage 2. Use live ledger routes during the private beta.
          </p>

          {/* ---- Stats bar ---- */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--s-border)" }}>
            {[
              { label: "Free tier",      value: "50/day" },
              { label: "Luca tier",      value: "500/day" },
              { label: "API tier",       value: "2,000/day" },
              { label: "Auth",           value: "Bearer" },
            ].map((stat) => (
              <div key={stat.label}>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--s-muted)", margin: "0 0 2px" }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--s-ink)", margin: 0 }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Endpoints ---- */}
        <div className="stitch-card">
          <div className="stitch-card-head">
            <h3>Endpoints</h3>
          </div>
          {ledger.hasLedger ? (
            <div className="stitch-endpoints">
              {allEndpoints.map((ep) => (
                <div key={ep.path} className="stitch-endpoint-row">
                  <span className={`stitch-method ${ep.method === "POST" ? "post" : ""}`}>
                    {ep.method}
                  </span>
                  <code className="stitch-endpoint-path">{ep.path}</code>
                  <span className="stitch-endpoint-note">{ep.note}</span>
                  <button
                    className="stitch-icon-btn"
                    type="button"
                    onClick={() =>
                      ledger.copyText(
                        `${typeof window !== "undefined" ? window.location.origin : ""}${ep.path}`,
                        ep.path,
                      )
                    }
                    aria-label="Copy endpoint"
                  >
                    <StitchIcon
                      name={ledger.copied === ep.path ? "check" : "content_copy"}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <StitchEmpty compact>Scan a wallet on Overview to generate live endpoints.</StitchEmpty>
          )}
        </div>

        {/* ---- Code snippet ---- */}
        <div className="stitch-card stitch-api-example">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--s-ink)", margin: 0 }}>
              Quick Integration
            </h3>
            <div style={{ display: "flex", gap: "2px", background: "var(--s-surface-hover)", border: "1px solid var(--s-border)", borderRadius: "6px", padding: "3px" }}>
              {CODE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCodeTab(tab)}
                  style={{
                    padding: "3px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: codeTab === tab ? "var(--s-surface)" : "transparent",
                    color: codeTab === tab ? "var(--s-ink)" : "var(--s-muted)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                onClick={() => ledger.copyText(CODE_SAMPLES[codeTab], "code")}
                style={{
                  marginLeft: "4px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "transparent",
                  color: "var(--s-primary)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <StitchIcon name={ledger.copied === "code" ? "check" : "content_copy"} />
                {ledger.copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre style={{
            background: "var(--s-surface-hover)",
            border: "1px solid var(--s-border)",
            borderRadius: "6px",
            padding: "16px",
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            color: "var(--s-api)",
            overflow: "auto",
            margin: 0,
            lineHeight: "1.7",
          }}>
            {CODE_SAMPLES[codeTab]}
          </pre>
        </div>
      </section>
    </StitchShell>
  );
}
