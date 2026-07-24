"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/badge";

type ManifestWallet = { address: string; role: string; label?: string };
type ManifestPreview = { wallets: ManifestWallet[]; agentName?: string; ref_id?: string };
type FetchManifestResponse = { wallets?: ManifestWallet[]; ref_id?: string; error?: string; detail?: string };

const ROLES = ["treasury", "fee", "deployer", "operator", "rewards", "revenue", "unknown"];

function roleColor(role: string): string {
  if (role === "treasury" || role === "revenue") return "var(--accent)";
  if (role === "fee") return "#5B9EF4";
  if (role === "deployer") return "#8B7CF6";
  if (role === "operator") return "#F4B942";
  return "var(--muted)";
}

function roleVariant(role: string): "verified" | "wallets-declared" | "claimed" | "luca-managed" | "neutral" {
  if (role === "treasury" || role === "revenue") return "verified";
  if (role === "fee") return "wallets-declared";
  if (role === "deployer") return "luca-managed";
  if (role === "operator") return "claimed";
  return "neutral";
}

// ── Syntax-colored JSON preview ───────────────────────────────────────────────

function JsonPreview({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <pre style={{
      fontFamily: "var(--font-mono)", fontSize: "0.73rem",
      background: "var(--surface-soft)", padding: 16, borderRadius: 6,
      overflowX: "auto", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.65,
    }}>
      {lines.map((line, i) => {
        const keyMatch = line.match(/^(\s*)"([^"]+)":/);
        const strMatch = line.match(/:\s*"([^"]*)"(,?)$/);
        const numMatch = line.match(/:\s*(\d+)(,?)$/);
        if (keyMatch && strMatch) {
          const indent = keyMatch[1];
          const key = keyMatch[2];
          const val = strMatch[1];
          const comma = strMatch[2];
          return (
            <span key={i}>
              {indent}<span style={{ color: "#5B9EF4" }}>&quot;{key}&quot;</span>:{" "}
              <span style={{ color: "var(--accent)" }}>&quot;{val}&quot;</span>{comma}{"\n"}
            </span>
          );
        }
        if (keyMatch && numMatch) {
          const indent = keyMatch[1];
          const key = keyMatch[2];
          const val = numMatch[1];
          const comma = numMatch[2];
          return (
            <span key={i}>
              {indent}<span style={{ color: "#5B9EF4" }}>&quot;{key}&quot;</span>:{" "}
              <span style={{ color: "#F4B942" }}>{val}</span>{comma}{"\n"}
            </span>
          );
        }
        return <span key={i} style={{ color: "var(--muted)" }}>{line}{"\n"}</span>;
      })}
    </pre>
  );
}

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
      const res  = await fetch("/api/registry/fetch-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      const data = await res.json() as FetchManifestResponse;
      if (!res.ok || data.error) { setError(data.error ?? data.detail ?? "Could not fetch manifest."); return; }
      setPreview({ wallets: data.wallets ?? [], ref_id: data.ref_id });
    } catch { setError("Network error. Check the repo URL and try again."); }
    finally { setFetching(false); }
  }

  const exampleJson = `{
  "agent": "Your Agent Name",
  "wallets": [
    { "address": "0xYourTreasuryWallet", "role": "treasury", "label": "Primary treasury" },
    { "address": "0xYourFeeWallet",      "role": "fee",      "label": "Fee collection"    }
  ]
}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Input card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Attribution</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Fetch from GitHub</div>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.55 }}>
            Point to a GitHub repo containing a{" "}
            <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3 }}>.agent/wallets.json</code>{" "}
            manifest.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="op-input"
              placeholder="https://github.com/your-org/your-agent-repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchManifest()}
              style={{ flex: 1 }}
            />
            <button className="op-btn op-btn-primary" onClick={fetchManifest} disabled={fetching || !repoUrl.trim()}>
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          {error && <p style={{ color: "#F46060", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}
        </div>
      </div>

      {/* Preview result */}
      {preview && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Preview</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Manifest Preview</div>
            </div>
            {preview.ref_id && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--muted)" }}>ref: {preview.ref_id}</span>
            )}
          </div>
          {preview.wallets.length === 0 ? (
            <div style={{ padding: 16, color: "var(--muted)", fontSize: "0.81rem" }}>No wallets found in manifest.</div>
          ) : (
            preview.wallets.map((w, i) => (
              <div key={w.address} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                borderBottom: i < preview.wallets.length - 1 ? "1px solid var(--line)" : "none",
                background: i % 2 !== 0 ? "color-mix(in srgb, var(--surface-soft) 40%, transparent)" : "transparent",
              }}>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-soft)", border: "1px solid var(--line)",
                  color: roleColor(w.role),
                  fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>{w.role}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.address}</span>
                {w.label && <span style={{ fontSize: "0.7rem", color: "var(--muted)", flexShrink: 0 }}>{w.label}</span>}
              </div>
            ))
          )}
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: "0.74rem", color: "var(--muted)" }}>
            Manifest fetched and recorded. The Zetta team will review and activate attribution.
          </div>
        </div>
      )}

      {/* Format reference */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Format</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>wallets.json format</div>
        </div>
        <div style={{ padding: 16 }}>
          <JsonPreview value={exampleJson} />
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
            Place at{" "}
            <code style={{ fontFamily: "var(--font-mono)", background: "var(--surface-soft)", padding: "1px 5px", borderRadius: 3 }}>.agent/wallets.json</code>{" "}
            in your repo root. Valid roles: {ROLES.join(", ")}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Build manifest inline ────────────────────────────────────────────────

function BuildTab() {
  const [agentName, setAgentName]   = useState("");
  const [xHandle, setXHandle]       = useState("");
  const [wallets, setWallets]       = useState<ManifestWallet[]>([{ address: "", role: "treasury", label: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ ok: boolean; message: string } | null>(null);

  function addWallet() { setWallets([...wallets, { address: "", role: "fee", label: "" }]); }
  function removeWallet(i: number) { setWallets(wallets.filter((_, idx) => idx !== i)); }
  function updateWallet(i: number, field: keyof ManifestWallet, val: string) {
    setWallets(wallets.map((w, idx) => idx === i ? { ...w, [field]: val } : w));
  }

  const valid = agentName.trim().length > 0 &&
    wallets.every((w) => /^0x[0-9a-fA-F]{40}$/.test(w.address.trim()));

  const manifestObj = {
    agent: agentName || "Your Agent",
    wallets: wallets.map((w) => ({
      address: w.address || "0x…",
      role: w.role,
      ...(w.label?.trim() ? { label: w.label.trim() } : {}),
    })),
  };
  const manifestPreview = JSON.stringify(manifestObj, null, 2);

  async function submit() {
    if (!valid) return;
    setSubmitting(true); setResult(null);
    try {
      const res = await fetch("/api/registry/manifest-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName.trim(),
          wallets: wallets.map((w) => ({ address: w.address.trim(), role: w.role, label: w.label?.trim() || undefined })),
          x_handle: xHandle.trim() || undefined,
        }),
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Agent details */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Agent</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Agent Details</div>
          </div>
          <div style={{ padding: 16 }}>
            <div className="op-field">
              <label className="op-label">Agent name *</label>
              <input className="op-input" placeholder="My Agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            </div>
            <div className="op-field">
              <label className="op-label">X / Twitter handle <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
              <input className="op-input" placeholder="@myagent" value={xHandle} onChange={(e) => setXHandle(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Wallets */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Wallets</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Wallet Declarations</div>
            </div>
            <button className="op-btn" style={{ fontSize: "0.73rem", padding: "4px 10px" }} onClick={addWallet}>+ Add wallet</button>
          </div>
          <div>
            {wallets.map((w, i) => (
              <div key={i} style={{
                padding: "14px 16px",
                borderBottom: i < wallets.length - 1 ? "1px solid var(--line)" : "none",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", minWidth: 20, fontFamily: "var(--font-mono)" }}>#{i + 1}</span>
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
                  <select
                    className="op-input"
                    style={{ width: 130, fontSize: "0.78rem" }}
                    value={w.role}
                    onChange={(e) => updateWallet(i, "role", e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    className="op-input"
                    style={{ flex: 1, fontSize: "0.78rem" }}
                    placeholder="Label (optional)"
                    value={w.label ?? ""}
                    onChange={(e) => updateWallet(i, "label", e.target.value)}
                  />
                </div>
                {w.address && !/^0x[0-9a-fA-F]{40}$/.test(w.address.trim()) && (
                  <p style={{ fontSize: "0.72rem", color: "#F46060", marginTop: 4, paddingLeft: 28 }}>Invalid address format</p>
                )}
              </div>
            ))}
            <div style={{ padding: "14px 16px", borderTop: wallets.length > 0 ? "1px solid var(--line)" : "none" }}>
              <button
                className="op-btn op-btn-primary"
                style={{ width: "100%" }}
                onClick={submit}
                disabled={submitting || !valid}
              >
                {submitting ? "Submitting…" : "Submit Manifest"}
              </button>
              {result && (
                <div className={`op-alert ${result.ok ? "op-alert-info" : "op-alert-warn"}`} style={{ marginTop: 10, marginBottom: 0 }}>
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: live JSON preview */}
      <div style={{ position: "sticky", top: 80, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Output</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Live Preview</div>
        </div>
        <div style={{ padding: 16 }}>
          <JsonPreview value={manifestPreview} />
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
            This JSON will be submitted directly to Zetta. No GitHub repo required.
          </p>
        </div>
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
      const res = await fetch("/api/registry/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_slug: agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          wallet_address: walletAddr.trim(),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) setResult({ ok: true, message: "Claim submitted. The Zetta team will review and verify your attribution." });
      else setResult({ ok: false, message: data.error ?? "Claim failed." });
    } catch { setResult({ ok: false, message: "Network error. Try again." }); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Claim</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Claim a Wallet</div>
        </div>
        <div style={{ padding: 16 }}>
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
            {walletAddr && !/^0x[0-9a-fA-F]{40}$/.test(walletAddr.trim()) && (
              <p style={{ fontSize: "0.72rem", color: "#F46060", marginTop: 4 }}>Invalid address format</p>
            )}
          </div>
          <div className="op-field">
            <label className="op-label">Role</label>
            <select className="op-input" value={walletRole} onChange={(e) => setWalletRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            className="op-btn op-btn-primary"
            onClick={submit}
            disabled={loading || !agentName.trim() || !walletAddr.trim()}
          >
            {loading ? "Submitting…" : "Submit Claim"}
          </button>
          {result && (
            <div className={`op-alert ${result.ok ? "op-alert-info" : "op-alert-warn"}`} style={{ marginTop: 12, marginBottom: 0 }}>
              {result.message}
            </div>
          )}
        </div>
      </div>
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
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">Attribution</h1>
          <p className="op-page-sub">Declare which wallets belong to your agent. Attribution unlocks financial books, reports, and Luca analysis.</p>
        </div>
      </div>

      {/* Underline tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: tab === id ? "var(--accent)" : "var(--muted)",
              fontSize: "0.78rem",
              fontWeight: tab === id ? 700 : 500,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.12s, border-color 0.12s",
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
