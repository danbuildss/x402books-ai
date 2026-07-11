"use client";

import { useState } from "react";

type ManifestWallet = { address: string; role: string; label?: string };
type ManifestPreview = { wallets: ManifestWallet[]; agentName?: string; ref_id?: string };
type FetchManifestResponse = { wallets?: ManifestWallet[]; ref_id?: string; error?: string; detail?: string };

const ROLES = ["treasury", "fee", "deployer", "operator", "rewards", "revenue", "unknown"];

// ── Tab: Fetch from GitHub ────────────────────────────────────────────────────

function FetchTab() {
  const [repoUrl, setRepoUrl]   = useState("");
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview]   = useState<ManifestPreview | null>(null);
  const [error, setError]       = useState("");

  async function fetchManifest() {
    if (!repoUrl.trim()) return;
    setFetching(true); setError(""); setPreview(null);
    try {
      const res  = await fetch("/api/registry/fetch-manifest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo_url: repoUrl.trim() }) });
      const data = await res.json() as FetchManifestResponse;
      if (!res.ok || data.error) { setError(data.error ?? data.detail ?? "Could not fetch manifest."); return; }
      setPreview({ wallets: data.wallets ?? [], ref_id: data.ref_id });
    } catch { setError("Network error. Check the repo URL and try again."); }
    finally { setFetching(false); }
  }

  return (
    <div>
      <div className="op-card">
        <h2 className="op-card-title" style={{ marginBottom: 4 }}>Fetch from GitHub</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Point to a GitHub repo containing a <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 4 }}>.agent/wallets.json</code> manifest.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="op-input" placeholder="https://github.com/your-org/your-agent-repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchManifest()} />
          <button className="op-btn op-btn-primary" onClick={fetchManifest} disabled={fetching || !repoUrl.trim()}>{fetching ? "Fetching…" : "Fetch"}</button>
        </div>
        {error && <p style={{ color: "#F46060", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}
      </div>

      {preview && (
        <div className="op-card">
          <div className="op-card-head">
            <h2 className="op-card-title">Manifest Preview</h2>
            {preview.ref_id && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)" }}>ref: {preview.ref_id}</span>}
          </div>
          {preview.wallets.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.81rem" }}>No wallets found in manifest.</p>
          ) : (
            <table className="op-table">
              <thead><tr><th>Address</th><th>Role</th><th>Label</th></tr></thead>
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
            Manifest fetched and recorded. The Zetta team will review and activate attribution.
          </div>
        </div>
      )}

      <div className="op-card">
        <h2 className="op-card-title" style={{ marginBottom: 8 }}>wallets.json format</h2>
        <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--muted)", background: "var(--surface-soft)", padding: 14, borderRadius: 7, overflowX: "auto", margin: 0 }}>{`{
  "agent": "Your Agent Name",
  "wallets": [
    { "address": "0xYourTreasuryWallet", "role": "treasury", "label": "Primary treasury" },
    { "address": "0xYourFeeWallet",      "role": "fee",      "label": "Fee collection"    }
  ]
}`}</pre>
        <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 10 }}>
          Place at <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 4 }}>.agent/wallets.json</code> in your repo root.
          Valid roles: {ROLES.join(", ")}.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Build manifest inline ────────────────────────────────────────────────

function BuildTab() {
  const [agentName, setAgentName] = useState("");
  const [xHandle, setXHandle]     = useState("");
  const [wallets, setWallets]     = useState<ManifestWallet[]>([{ address: "", role: "treasury", label: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; message: string } | null>(null);

  function addWallet() { setWallets([...wallets, { address: "", role: "fee", label: "" }]); }
  function removeWallet(i: number) { setWallets(wallets.filter((_, idx) => idx !== i)); }
  function updateWallet(i: number, field: keyof ManifestWallet, val: string) {
    setWallets(wallets.map((w, idx) => idx === i ? { ...w, [field]: val } : w));
  }

  const valid = agentName.trim().length > 0 &&
    wallets.every((w) => /^0x[0-9a-fA-F]{40}$/.test(w.address.trim()));

  const manifestPreview = JSON.stringify({
    agent: agentName || "Your Agent",
    wallets: wallets.map((w) => ({ address: w.address || "0x…", role: w.role, ...(w.label ? { label: w.label } : {}) })),
  }, null, 2);

  async function submit() {
    if (!valid) return;
    setSubmitting(true); setResult(null);
    try {
      const res  = await fetch("/api/registry/manifest-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: agentName.trim(), wallets: wallets.map((w) => ({ address: w.address.trim(), role: w.role, label: w.label?.trim() || undefined })), x_handle: xHandle.trim() || undefined }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) setResult({ ok: true, message: "Manifest submitted. The Zetta team will review and activate attribution within 24 hours." });
      else setResult({ ok: false, message: data.error ?? "Submission failed." });
    } catch { setResult({ ok: false, message: "Network error. Try again." }); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      {/* Left: form */}
      <div>
        <div className="op-card">
          <h2 className="op-card-title" style={{ marginBottom: 16 }}>Agent Details</h2>
          <div className="op-field">
            <label className="op-label">Agent name *</label>
            <input className="op-input" placeholder="My Agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div className="op-field">
            <label className="op-label">X / Twitter handle <span style={{ color: "var(--muted)" }}>(optional)</span></label>
            <input className="op-input" placeholder="@myagent" value={xHandle} onChange={(e) => setXHandle(e.target.value)} />
          </div>
        </div>

        <div className="op-card">
          <div className="op-card-head">
            <h2 className="op-card-title">Wallets</h2>
            <button className="op-btn" style={{ fontSize: "0.73rem", padding: "4px 10px" }} onClick={addWallet}>+ Add wallet</button>
          </div>
          {wallets.map((w, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: i < wallets.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", minWidth: 20 }}>#{i + 1}</span>
                <input
                  className="op-input"
                  style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}
                  placeholder="0x…"
                  value={w.address}
                  onChange={(e) => updateWallet(i, "address", e.target.value)}
                />
                {wallets.length > 1 && (
                  <button className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px", color: "var(--muted)" }} onClick={() => removeWallet(i)}>✕</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, paddingLeft: 28 }}>
                <select className="op-input" style={{ width: 140, fontSize: "0.78rem" }} value={w.role} onChange={(e) => updateWallet(i, "role", e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input className="op-input" style={{ flex: 1, fontSize: "0.78rem" }} placeholder="Label (optional)" value={w.label ?? ""} onChange={(e) => updateWallet(i, "label", e.target.value)} />
              </div>
              {w.address && !/^0x[0-9a-fA-F]{40}$/.test(w.address.trim()) && (
                <p style={{ fontSize: "0.72rem", color: "#F46060", marginTop: 4, paddingLeft: 28 }}>Invalid address format</p>
              )}
            </div>
          ))}
          <button className="op-btn op-btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={submit} disabled={submitting || !valid}>
            {submitting ? "Submitting…" : "Submit Manifest"}
          </button>
          {result && (
            <div className={`op-alert ${result.ok ? "op-alert-info" : "op-alert-warn"}`} style={{ marginTop: 12, marginBottom: 0 }}>
              {result.message}
            </div>
          )}
        </div>
      </div>

      {/* Right: live JSON preview */}
      <div className="op-card" style={{ position: "sticky", top: 80 }}>
        <h2 className="op-card-title" style={{ marginBottom: 12 }}>Live Preview</h2>
        <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.73rem", color: "var(--muted)", background: "var(--surface-soft)", padding: 14, borderRadius: 7, overflowX: "auto", margin: 0, whiteSpace: "pre-wrap" }}>{manifestPreview}</pre>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
          This JSON will be submitted directly to Zetta. No GitHub repo required.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Claim a wallet ───────────────────────────────────────────────────────

function ClaimTab() {
  const [agentName, setAgentName]   = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [walletRole, setWalletRole] = useState("treasury");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);

  async function submit() {
    if (!agentName.trim() || !walletAddr.trim()) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddr.trim())) {
      setResult({ ok: false, message: "Invalid wallet address format (must be 0x + 40 hex chars)." });
      return;
    }
    setLoading(true); setResult(null);
    try {
      const res  = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_slug: agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), wallet_address: walletAddr.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) setResult({ ok: true, message: "Claim submitted. The Zetta team will review and verify your attribution." });
      else setResult({ ok: false, message: data.error ?? "Claim failed." });
    } catch { setResult({ ok: false, message: "Network error. Try again." }); }
    finally { setLoading(false); }
  }

  return (
    <div className="op-card" style={{ maxWidth: 520 }}>
      <h2 className="op-card-title" style={{ marginBottom: 4 }}>Claim a Wallet</h2>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.55 }}>
        If your agent is already in the registry, submit a claim to associate a wallet address with it.
      </p>
      <div className="op-field">
        <label className="op-label">Agent name</label>
        <input className="op-input" placeholder="e.g. My Agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
      </div>
      <div className="op-field">
        <label className="op-label">Wallet address</label>
        <input className="op-input" placeholder="0x…" value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} />
      </div>
      <div className="op-field">
        <label className="op-label">Role</label>
        <select className="op-input" value={walletRole} onChange={(e) => setWalletRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <button className="op-btn op-btn-primary" onClick={submit} disabled={loading || !agentName.trim() || !walletAddr.trim()}>
        {loading ? "Submitting…" : "Submit Claim"}
      </button>
      {result && (
        <div className={`op-alert ${result.ok ? "op-alert-info" : "op-alert-warn"}`} style={{ marginTop: 12, marginBottom: 0 }}>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabId = "build" | "fetch" | "claim";

const TABS: { id: TabId; label: string }[] = [
  { id: "build", label: "Build Manifest" },
  { id: "fetch", label: "Fetch from GitHub" },
  { id: "claim", label: "Claim a Wallet" },
];

export default function AttributionPage() {
  const [tab, setTab] = useState<TabId>("build");

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Attribution</h1>
        <p className="op-page-sub">Declare which wallets belong to your agent. Attribution unlocks financial books, reports, and Luca analysis.</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
        {TABS.map(({ id, label }) => (
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
          >{label}</button>
        ))}
      </div>

      {tab === "build" && <BuildTab />}
      {tab === "fetch" && <FetchTab />}
      {tab === "claim" && <ClaimTab />}
    </div>
  );
}
