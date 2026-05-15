"use client";

import { useEffect, useRef, useState } from "react";
import { StitchHeader, StitchShell, StitchEmpty } from "@/components/stitch-app";

type ApiKeyRecord = {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  rate_limit_per_day: number;
  requests_today: number;
  requests_total: number;
  created_at: string;
  last_used_at: string | null;
};

function relDate(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/keys");
      const data = await res.json() as { keys: ApiKeyRecord[] };
      setKeys(data.keys ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json() as { key: string; record: ApiKeyRecord };
      setNewKey(data.key);
      setKeys((prev) => [data.record, ...prev]);
      setShowForm(false);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <StitchShell>
      <StitchHeader
        title="Developer API"
        description="Manage API keys and monitor usage."
      />

      {/* New key banner — shown once after creation */}
      {newKey && (
        <div className="stitch-card" style={{ borderColor: "var(--st-green)", background: "color-mix(in srgb, var(--st-green) 8%, var(--st-surface))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--st-green)", fontSize: 18 }}>check_circle</span>
            <strong style={{ color: "var(--st-green)" }}>API key created — copy it now</strong>
          </div>
          <p style={{ color: "var(--st-muted)", fontSize: 12, marginBottom: 10 }}>
            This key will not be shown again. Store it somewhere safe.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{
              flex: 1, background: "var(--st-bg)", padding: "8px 12px",
              borderRadius: 6, fontFamily: "var(--st-mono)", fontSize: 13,
              border: "1px solid var(--st-border)", wordBreak: "break-all",
            }}>
              {newKey}
            </code>
            <button
              type="button"
              className="stitch-btn"
              onClick={() => copyKey(newKey)}
              style={{ whiteSpace: "nowrap" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              className="stitch-btn"
              onClick={() => setNewKey(null)}
              style={{ color: "var(--st-muted)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="stitch-card">
        <div className="stitch-card-head">
          <h3>API Keys</h3>
          <button
            type="button"
            className="stitch-btn"
            onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
            New Key
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "12px 0", borderBottom: "1px solid var(--st-border)" }}>
            <input
              ref={inputRef}
              className="stitch-agent-search-input"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--st-border)", background: "var(--st-bg)", color: "var(--st-text)", fontSize: 13 }}
              placeholder="Key name (e.g. My Agent)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowForm(false); }}
              maxLength={64}
            />
            <button
              type="button"
              className="stitch-btn"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button type="button" className="stitch-btn" onClick={() => setShowForm(false)} style={{ color: "var(--st-muted)" }}>
              Cancel
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ color: "var(--st-muted)", fontSize: 13, padding: "12px 0" }}>Loading keys…</div>
        ) : keys.length === 0 ? (
          <StitchEmpty compact>No API keys yet. Create one to get started.</StitchEmpty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {keys.map((key) => (
              <div key={key.id} style={{
                display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12,
                alignItems: "center", padding: "12px 0",
                borderBottom: "1px solid var(--st-border)",
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <strong style={{ fontSize: 14 }}>{key.name}</strong>
                    <code style={{ fontSize: 11, color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>
                      {key.key_prefix}…
                    </code>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--st-muted)" }}>
                    <span>Created {relDate(key.created_at)}</span>
                    <span>Last used: {relDate(key.last_used_at)}</span>
                    <span>{key.requests_total.toLocaleString()} total requests</span>
                  </div>
                </div>

                {/* Daily usage bar */}
                <div style={{ width: 100, textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--st-muted)", marginBottom: 3 }}>
                    {key.requests_today} / {key.rate_limit_per_day} today
                  </div>
                  <div style={{ height: 4, background: "var(--st-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${Math.min(100, (key.requests_today / key.rate_limit_per_day) * 100)}%`,
                      background: key.requests_today >= key.rate_limit_per_day ? "var(--st-red)" : "var(--st-blue)",
                    }} />
                  </div>
                </div>

                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 99,
                  background: key.is_active ? "color-mix(in srgb, var(--st-green) 15%, transparent)" : "color-mix(in srgb, var(--st-red) 15%, transparent)",
                  color: key.is_active ? "var(--st-green)" : "var(--st-red)",
                }}>
                  {key.is_active ? "Active" : "Revoked"}
                </span>

                <button
                  type="button"
                  onClick={() => handleRevoke(key.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--st-red)", padding: 4 }}
                  title="Revoke key"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API reference card */}
      <div className="stitch-card">
        <div className="stitch-card-head">
          <h3>Endpoints</h3>
          <span style={{ fontSize: 12, color: "var(--st-muted)" }}>Base URL: <code style={{ fontFamily: "var(--st-mono)" }}>https://x402books.ai/api/v1</code></span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { method: "GET", path: "/ledger-summary", desc: "Financial summary: total income, spend, net flow, budget status", params: "wallet, range" },
            { method: "GET", path: "/transactions", desc: "Paginated transaction list with USD values and categories", params: "wallet, range, page, limit" },
            { method: "GET", path: "/full-report", desc: "Complete scan: summary, portfolio, daily flows, categories", params: "wallet, range" },
            { method: "POST", path: "/categorize", desc: "AI-powered transaction categorization (uses Claude)", params: '{ wallet, range }' },
            { method: "GET", path: "/agent-financial-state", desc: "Agent-optimized financial snapshot with ecosystem detection", params: "wallet, range" },
          ].map((ep) => (
            <div key={ep.path} style={{
              display: "grid", gridTemplateColumns: "60px 200px 1fr auto",
              gap: 12, alignItems: "baseline", padding: "10px 0",
              borderBottom: "1px solid var(--st-border)", fontSize: 13,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, textAlign: "center",
                background: ep.method === "GET" ? "color-mix(in srgb, var(--st-blue) 15%, transparent)" : "color-mix(in srgb, var(--st-green) 15%, transparent)",
                color: ep.method === "GET" ? "var(--st-blue)" : "var(--st-green)",
              }}>
                {ep.method}
              </span>
              <code style={{ fontFamily: "var(--st-mono)", fontSize: 12 }}>{ep.path}</code>
              <span style={{ color: "var(--st-muted)", fontSize: 12 }}>{ep.desc}</span>
              <code style={{ fontFamily: "var(--st-mono)", fontSize: 11, color: "var(--st-muted)", whiteSpace: "nowrap" }}>{ep.params}</code>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: "var(--st-bg)", borderRadius: 8, border: "1px solid var(--st-border)" }}>
          <div style={{ fontSize: 12, color: "var(--st-muted)", marginBottom: 6 }}>Authentication</div>
          <code style={{ fontFamily: "var(--st-mono)", fontSize: 12 }}>
            Authorization: Bearer xb_live_…
          </code>
          <span style={{ fontSize: 12, color: "var(--st-muted)", marginLeft: 16 }}>or</span>
          <code style={{ fontFamily: "var(--st-mono)", fontSize: 12, marginLeft: 16 }}>
            X-API-Key: xb_live_…
          </code>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "var(--st-muted)" }}>
          Rate limit: <strong>100 requests / day</strong> per key. Resets at midnight UTC.
        </div>
      </div>
    </StitchShell>
  );
}
