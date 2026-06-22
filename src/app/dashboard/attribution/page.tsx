"use client";

import { useState } from "react";

type ManifestWallet = {
  address: string;
  role: string;
  label?: string;
};

type ManifestPreview = {
  wallets: ManifestWallet[];
  agentName?: string;
  ref_id?: string;
};

type FetchManifestResponse = {
  wallets?: ManifestWallet[];
  ref_id?: string;
  error?: string;
  detail?: string;
};

const ROLES = ["treasury", "fee", "deployer", "operator", "rewards", "unknown"];

export default function AttributionPage() {
  const [tab, setTab] = useState<"submit" | "declare">("submit");
  const [repoUrl, setRepoUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<ManifestPreview | null>(null);
  const [fetchError, setFetchError] = useState("");

  // Manual declaration
  const [agentName, setAgentName] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [walletRole, setWalletRole] = useState("treasury");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function fetchManifest() {
    if (!repoUrl.trim()) return;
    setFetching(true); setFetchError(""); setPreview(null);
    try {
      const res = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const data = await res.json() as FetchManifestResponse;
      if (!res.ok || data.error) {
        setFetchError(data.error ?? data.detail ?? "Could not fetch manifest.");
        return;
      }
      setPreview({ wallets: data.wallets ?? [], ref_id: data.ref_id });
    } catch {
      setFetchError("Network error. Check the repo URL and try again.");
    } finally { setFetching(false); }
  }

  async function claimWallet() {
    if (!agentName.trim() || !walletAddr.trim()) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddr.trim())) {
      setClaimResult({ ok: false, message: "Invalid wallet address format (must be 0x + 40 hex chars)." });
      return;
    }
    setClaimLoading(true); setClaimResult(null);
    try {
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), wallet_address: walletAddr.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (res.ok) {
        setClaimResult({ ok: true, message: "Claim submitted. The Zetta team will review and verify your attribution." });
      } else {
        setClaimResult({ ok: false, message: data.error ?? "Claim failed." });
      }
    } catch {
      setClaimResult({ ok: false, message: "Network error. Try again." });
    } finally { setClaimLoading(false); }
  }

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Attribution</h1>
        <p className="op-page-sub">Declare which wallets belong to your agent. Attribution unlocks financial books, reports, and Luca analysis.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {([["submit", "Submit via Manifest"], ["declare", "Claim a Wallet"]] as const).map(([id, label]) => (
          <button
            key={id}
            className="op-btn op-btn-ghost"
            onClick={() => setTab(id)}
            style={{
              borderRadius: "7px 7px 0 0", borderBottom: "none",
              fontWeight: tab === id ? 700 : 400,
              color: tab === id ? "var(--accent)" : "var(--muted)",
              borderColor: tab === id ? "var(--line)" : "transparent",
              background: tab === id ? "var(--surface)" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "submit" && (
        <div>
          <div className="op-card">
            <h2 className="op-card-title" style={{ marginBottom: 4 }}>Fetch Wallet Manifest</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
              Point to a GitHub or GitLab repo containing a <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 4 }}>.agent/wallets.json</code> manifest. Zetta will parse the wallet declarations and attribute on-chain activity to your agent.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="op-input"
                placeholder="https://github.com/your-org/your-agent-repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchManifest()}
              />
              <button className="op-btn op-btn-primary" onClick={fetchManifest} disabled={fetching || !repoUrl.trim()}>
                {fetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
            {fetchError && <p style={{ color: "#c0392b", fontSize: "0.78rem", marginTop: 8 }}>{fetchError}</p>}
          </div>

          {preview && (
            <div className="op-card">
              <div className="op-card-head">
                <h2 className="op-card-title">Manifest Preview</h2>
                {preview.ref_id && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)" }}>ref: {preview.ref_id}</span>
                )}
              </div>
              {preview.wallets.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.81rem" }}>No wallets found in manifest.</p>
              ) : (
                <table className="op-table">
                  <thead>
                    <tr><th>Address</th><th>Role</th><th>Label</th></tr>
                  </thead>
                  <tbody>
                    {preview.wallets.map((w) => (
                      <tr key={w.address}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>{w.address}</td>
                        <td><span className="op-badge" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{w.role}</span></td>
                        <td style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{w.label ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 16, padding: 12, background: "var(--surface-soft)", borderRadius: 7, fontSize: "0.77rem", color: "var(--muted)" }}>
                Manifest fetched successfully. Zetta has recorded these wallet declarations. To complete verification, contact the Zetta team or use the wallet signing flow in the Claim tab.
              </div>
            </div>
          )}

          <div className="op-card">
            <h2 className="op-card-title" style={{ marginBottom: 8 }}>wallets.json format</h2>
            <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--muted)", background: "var(--surface-soft)", padding: 14, borderRadius: 7, overflowX: "auto", margin: 0 }}>{`{
  "agent": "Your Agent Name",
  "wallets": [
    {
      "address": "0xYourTreasuryWallet",
      "role": "treasury",
      "label": "Primary treasury"
    },
    {
      "address": "0xYourFeeWallet",
      "role": "fee",
      "label": "Fee collection"
    }
  ]
}`}</pre>
            <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 10 }}>
              Place this file at <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 4 }}>.agent/wallets.json</code> in your repo root.
              Valid roles: {ROLES.join(", ")}.
            </p>
          </div>
        </div>
      )}

      {tab === "declare" && (
        <div className="op-card">
          <h2 className="op-card-title" style={{ marginBottom: 4 }}>Claim a Wallet for an Agent</h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.55 }}>
            If your agent is already in the registry, submit a claim to associate your wallet address with it. The Zetta team will review ownership evidence.
          </p>
          <div className="op-field">
            <label className="op-label">Agent name (as it appears in the registry)</label>
            <input className="op-input" placeholder="e.g. My Agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div className="op-field">
            <label className="op-label">Wallet address</label>
            <input className="op-input" placeholder="0x..." value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} />
          </div>
          <div className="op-field">
            <label className="op-label">Role</label>
            <select
              className="op-input"
              value={walletRole}
              onChange={(e) => setWalletRole(e.target.value)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="op-btn op-btn-primary" onClick={claimWallet} disabled={claimLoading || !agentName.trim() || !walletAddr.trim()}>
            {claimLoading ? "Submitting…" : "Submit Claim"}
          </button>
          {claimResult && (
            <div className={`op-alert ${claimResult.ok ? "op-alert-info" : "op-alert-warn"}`} style={{ marginTop: 12, marginBottom: 0 }}>
              {claimResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
