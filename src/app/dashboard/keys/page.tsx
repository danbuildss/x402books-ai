"use client";

import { useEffect, useRef, useState } from "react";
import { TIER_LABELS, TIER_LIMITS, type LucaTier } from "@/lib/luca-token";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { LedgerCard, LedgerRow, SectionLabel } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

type ApiKeyRecord = {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  tier: LucaTier;
  rate_limit_per_day: number;
  requests_today: number;
  requests_total: number;
  wallet_address: string | null;
  created_at: string;
  last_used_at: string | null;
};

const TIER_COLORS: Record<LucaTier, string> = {
  free: "var(--muted)", holder: "var(--blue, #5B9EF4)", whale: "var(--accent)", luca: "#8B7CF6",
};

const TIER_BADGE_VARIANT: Record<LucaTier, "neutral" | "blue" | "green" | "purple"> = {
  free: "neutral", holder: "blue", whale: "green", luca: "purple",
};

function relDate(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function WalletLinker({ keyId, currentTier, onLinked }: {
  keyId: string;
  currentTier: LucaTier;
  onLinked: (wallet: string, tier: LucaTier) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "connecting" | "signing" | "verifying">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ tier: LucaTier; balance: number } | null>(null);

  async function handleLink() {
    const ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum) { setError("No wallet detected. Install MetaMask or another browser wallet."); return; }
    setLoading(true); setError("");
    try {
      setStep("connecting");
      const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts?.[0];
      if (!address) { setError("No account connected."); return; }
      const chRes = await fetch("/api/developer/verify-wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, walletAddress: address }),
      });
      const chData = await chRes.json() as { message?: string; error?: string };
      if (!chRes.ok || !chData.message) { setError(chData.error ?? "Could not get challenge."); return; }
      setStep("signing");
      const signature = await ethereum.request({ method: "personal_sign", params: [chData.message, address] }) as string;
      setStep("verifying");
      const res = await fetch("/api/developer/verify-wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, walletAddress: address, signature }),
      });
      const data = await res.json() as { tier: LucaTier; luca_balance: number; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to link wallet."); return; }
      setResult({ tier: data.tier, balance: data.luca_balance });
      onLinked(address, data.tier);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg.includes("rejected") || msg.includes("denied") ? "Signature rejected." : "Could not complete wallet verification.");
    } finally { setLoading(false); setStep("idle"); }
  }

  const stepLabel = step === "connecting" ? "Connecting…" : step === "signing" ? "Sign in wallet…" : step === "verifying" ? "Verifying…" : "Connect & Sign";

  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--surface-soft)", borderRadius: 8, border: "1px solid var(--line)" }}>
      <p style={{ fontSize: "0.74rem", color: "var(--muted)", margin: "0 0 8px" }}>
        Sign with your wallet to check $LUCA balance and unlock a higher tier. The signature is free — no transaction.
      </p>
      <button className="op-btn" onClick={handleLink} disabled={loading}>{loading ? stepLabel : "Connect & Sign"}</button>
      {error && <p style={{ color: "var(--negative)", fontSize: "0.75rem", marginTop: 6 }}>{error}</p>}
      {result && (
        <p style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: 6 }}>
          ✓ Wallet verified — {TIER_LABELS[result.tier]} tier ({TIER_LIMITS[result.tier].toLocaleString()} req/day)
        </p>
      )}
      {!result && currentTier === "free" && (
        <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 6 }}>
          Hold ≥1,000 $LUCA → Developer (500/day) &nbsp;·&nbsp; Hold ≥10,000 → Enterprise (2,000/day)
        </p>
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Agent-scoped key creation
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentSlug, setAgentSlug] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentKeyResult, setAgentKeyResult] = useState<string | null>(null);
  const [agentKeyCopied, setAgentKeyCopied] = useState(false);
  const [agentKeyError, setAgentKeyError] = useState("");
  const agentSlugRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/keys");
      if (res.status === 401) { setSignedOut(true); setKeys([]); return; }
      const data = await res.json() as { keys: ApiKeyRecord[] };
      setSignedOut(false);
      setKeys(data.keys ?? []);
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json() as { key?: string; record?: ApiKeyRecord; error?: string };
      if (!res.ok || !data.key || !data.record) { setCreateError(data.error ?? "Could not create API key."); if (res.status === 401) setSignedOut(true); return; }
      setNewKey(data.key);
      setKeys((prev) => [data.record!, ...prev]);
      setShowForm(false); setNewName(""); setCreateError("");
    } finally { setCreating(false); }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function handleWalletLinked(keyId: string, wallet: string, tier: LucaTier) {
    setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, wallet_address: wallet.toLowerCase(), tier, rate_limit_per_day: TIER_LIMITS[tier] } : k));
    setExpandedWallet(null);
  }

  async function handleCreateAgentKey() {
    const slug = agentSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");
    if (!slug) { setAgentKeyError("Enter a valid agent slug."); return; }
    setCreatingAgent(true);
    setAgentKeyError("");
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `agent:${slug}` }),
      });
      const data = await res.json() as { key?: string; record?: ApiKeyRecord; error?: string };
      if (!res.ok || !data.key || !data.record) {
        setAgentKeyError(data.error ?? "Could not create agent key.");
        if (res.status === 401) setSignedOut(true);
        return;
      }
      setAgentKeyResult(data.key);
      setKeys((prev) => [data.record!, ...prev]);
      setAgentSlug("");
    } finally { setCreatingAgent(false); }
  }

  function copyAgentKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setAgentKeyCopied(true);
      setTimeout(() => setAgentKeyCopied(false), 2000);
    });
  }

  return (
    <div className="op-page">
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">API Keys</h1>
          <p className="op-page-sub">Create and manage API keys for programmatic access to your agent data.</p>
        </div>
        <button className="op-btn op-btn-primary" onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
          + New Key
        </button>
      </div>

      {/* Tier overview */}
      <MetricGrid cols={4} style={{ marginBottom: 24 }}>
        {(["free", "holder", "whale"] as LucaTier[]).map((tier) => (
          <MetricCard
            key={tier}
            label={TIER_LABELS[tier]}
            value={TIER_LIMITS[tier].toLocaleString()}
            sub="requests / day"
            valueColor={TIER_COLORS[tier]}
          />
        ))}
        <MetricCard
          label="Active Keys"
          value={keys.filter((k) => k.is_active !== false).length}
          sub={`of ${keys.length} total`}
        />
      </MetricGrid>

      {/* New key banner */}
      {newKey && (
        <div className="op-card" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>✓ API key created — copy it now</span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.76rem", margin: "0 0 10px" }}>This key will not be shown again.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, background: "var(--surface)", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: "0.8rem", border: "1px solid var(--line)", wordBreak: "break-all" }}>
              {newKey}
            </code>
            <button className="op-btn op-btn-primary" onClick={() => copyKey(newKey)}>{copied ? "✓ Copied" : "Copy"}</button>
            <button className="op-btn op-btn-ghost" onClick={() => setNewKey(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <LedgerCard
        eyebrow="Keys"
        title="API Keys"
        action={
          <button className="op-btn op-btn-primary" style={{ fontSize: "0.75rem", padding: "5px 10px" }}
            onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
            + New Key
          </button>
        }
      >
        {showForm && (
          <div style={{ padding: "14px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                className="op-input"
                placeholder="Key name (e.g. Production, My Agent)"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowForm(false); setCreateError(""); } }}
                maxLength={64}
              />
              <button className="op-btn op-btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>{creating ? "Creating…" : "Create"}</button>
              <button className="op-btn op-btn-ghost" onClick={() => { setShowForm(false); setCreateError(""); }}>Cancel</button>
            </div>
            {createError && <p style={{ color: "var(--negative)", fontSize: "0.76rem", marginTop: 8 }}>{createError}</p>}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "14px", color: "var(--muted)", fontSize: "0.82rem" }}>Loading keys…</div>
        ) : signedOut ? (
          <div className="op-empty">
            <p className="op-empty-title">Session expired</p>
            <p className="op-empty-desc">Sign in again to manage your API keys.</p>
            <a href="/access" className="op-btn op-btn-primary">Sign In →</a>
          </div>
        ) : keys.length === 0 && !showForm ? (
          <div className="op-empty">
            <p className="op-empty-title">No API keys yet</p>
            <p className="op-empty-desc">Create a key to access your agent&apos;s financial data via the Zetta API.</p>
            <button className="op-btn op-btn-primary" onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}>Create First Key →</button>
          </div>
        ) : (
          keys.map((key, i) => (
            <div key={key.id}>
              <LedgerRow
                first={i === 0 && !showForm}
                last={i === keys.length - 1 && expandedWallet !== key.id}
                label={
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>{key.name}</span>
                      <code style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{key.key_prefix}…</code>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: "0.72rem", color: "var(--muted)" }}>
                      <span>Created {relDate(key.created_at)}</span>
                      <span>Last used: {relDate(key.last_used_at)}</span>
                      <span>{key.requests_total.toLocaleString()} total</span>
                      {key.wallet_address && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>
                          {key.wallet_address.slice(0, 6)}…{key.wallet_address.slice(-4)}
                        </span>
                      )}
                    </div>
                    {/* Usage bar */}
                    <div style={{ marginTop: 6, maxWidth: 240 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", marginBottom: 3 }}>
                        <span>{key.requests_today} / {key.rate_limit_per_day} today</span>
                        <span>{Math.round((key.requests_today / key.rate_limit_per_day) * 100)}%</span>
                      </div>
                      <div className="op-usage-bar-track">
                        <div className="op-usage-bar-fill" style={{
                          width: `${Math.min(100, (key.requests_today / key.rate_limit_per_day) * 100)}%`,
                          background: key.requests_today >= key.rate_limit_per_day ? "var(--negative)" : TIER_COLORS[key.tier ?? "free"],
                        }} />
                      </div>
                    </div>
                  </div>
                }
                badge={<StatusBadge variant={TIER_BADGE_VARIANT[key.tier ?? "free"]}>{TIER_LABELS[key.tier ?? "free"]}</StatusBadge>}
                value={
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                      onClick={() => setExpandedWallet(expandedWallet === key.id ? null : key.id)}>
                      {key.wallet_address ? "Re-verify" : "Link Wallet"}
                    </button>
                    <button className="op-btn op-btn-danger" style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                      onClick={() => handleRevoke(key.id)}>
                      Revoke
                    </button>
                  </div>
                }
                style={{ alignItems: "flex-start", padding: "12px 14px" }}
              />
              {expandedWallet === key.id && (
                <div style={{
                  padding: "0 14px 14px",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderTop: "none",
                  borderRadius: i === keys.length - 1 ? "0 0 8px 8px" : 0,
                }}>
                  <WalletLinker
                    keyId={key.id}
                    currentTier={key.tier ?? "free"}
                    onLinked={(wallet, tier) => handleWalletLinked(key.id, wallet, tier)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </LedgerCard>

      {/* Agent-scoped key */}
      <LedgerCard eyebrow="Scoped Keys" title="Agent-scoped key">
        <div style={{ padding: "14px" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0 0 12px" }}>
            Restrict a key to one agent — it can only query that agent&apos;s data.
          </p>
          {agentKeyResult ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>✓ Agent key created — copy it now</span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.76rem", margin: "0 0 10px" }}>
                This key will not be shown again. Name it with <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>agent:{agentSlug || "your-slug"}</code> so the API enforces the scope.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ flex: 1, background: "var(--surface-soft)", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: "0.8rem", border: "1px solid var(--line)", wordBreak: "break-all" }}>
                  {agentKeyResult}
                </code>
                <button className="op-btn op-btn-primary" onClick={() => copyAgentKey(agentKeyResult)}>{agentKeyCopied ? "✓ Copied" : "Copy"}</button>
                <button className="op-btn op-btn-ghost" onClick={() => { setAgentKeyResult(null); setShowAgentForm(false); }}>Done</button>
              </div>
            </div>
          ) : showAgentForm ? (
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
                Enter your agent&apos;s registry slug (the part after <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>/registry/</code> in its profile URL).
                The key will be named <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>agent:your-slug</code> and restricted to that agent only.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 220, background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 7, padding: "0 10px", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)", flexShrink: 0 }}>agent:</span>
                  <input
                    ref={agentSlugRef}
                    className="op-input"
                    style={{ border: "none", background: "transparent", padding: "8px 0", flex: 1 }}
                    placeholder="your-agent-slug"
                    value={agentSlug}
                    onChange={(e) => { setAgentSlug(e.target.value); setAgentKeyError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateAgentKey(); if (e.key === "Escape") setShowAgentForm(false); }}
                    maxLength={64}
                  />
                </div>
                <button className="op-btn op-btn-primary" onClick={handleCreateAgentKey} disabled={creatingAgent || !agentSlug.trim()}>
                  {creatingAgent ? "Creating…" : "Create"}
                </button>
                <button className="op-btn op-btn-ghost" onClick={() => setShowAgentForm(false)}>Cancel</button>
              </div>
              {agentKeyError && <p style={{ color: "var(--negative)", fontSize: "0.75rem", marginTop: 8 }}>{agentKeyError}</p>}
            </div>
          ) : (
            <button
              className="op-btn"
              onClick={() => { setShowAgentForm(true); setAgentKeyError(""); setTimeout(() => agentSlugRef.current?.focus(), 50); }}
            >
              Create agent key
            </button>
          )}
        </div>
      </LedgerCard>

      {/* Auth reference */}
      <LedgerCard eyebrow="Usage" title="Using your key">
        <LedgerRow
          first
          label="Bearer token"
          value={
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--surface-soft)", padding: "4px 8px", borderRadius: 6 }}>
              Authorization: Bearer zt_live_…
            </code>
          }
        />
        <LedgerRow
          label="API key header"
          value={
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--surface-soft)", padding: "4px 8px", borderRadius: 6 }}>
              X-API-Key: zt_live_…
            </code>
          }
        />
        <LedgerRow
          last
          label="Base URL"
          value={
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
              https://www.zettaai.co/api/v1
            </code>
          }
        />
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}>
          <SectionLabel>
            <a href="/api" style={{ color: "var(--accent)" }}>Full API docs →</a>
          </SectionLabel>
        </div>
      </LedgerCard>
    </div>
  );
}
