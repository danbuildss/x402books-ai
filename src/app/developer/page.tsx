"use client";

import { useEffect, useRef, useState } from "react";
import { StitchHeader, StitchShell, StitchEmpty } from "@/components/stitch-app";
import { TIER_LABELS, TIER_LIMITS, TIER_THRESHOLDS, type LucaTier } from "@/lib/luca-token";

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
  free:   "var(--st-muted)",
  holder: "var(--st-blue)",
  whale:  "var(--st-green)",
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

function TierBadge({ tier }: { tier: LucaTier }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
      background: `color-mix(in srgb, ${TIER_COLORS[tier]} 15%, transparent)`,
      color: TIER_COLORS[tier],
    }}>
      {TIER_LABELS[tier]}
    </span>
  );
}

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function WalletLinker({ keyId, currentWallet, currentTier, onLinked }: {
  keyId: string;
  currentWallet: string | null;
  currentTier: LucaTier;
  onLinked: (wallet: string, tier: LucaTier, balance: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ tier: LucaTier; balance: number } | null>(null);

  // Connect → challenge → sign → verify. The wallet must prove control by
  // signing; pasting an address you don't own no longer upgrades the tier.
  async function handleLink() {
    setLoading(true); setError("");
    try {
      const eth = (window as unknown as { ethereum?: EthProvider }).ethereum;
      if (!eth) {
        setError("No wallet detected. Open this page in a wallet browser or install a wallet extension.");
        return;
      }

      setStep("Connecting wallet…");
      const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
      const account = accounts?.[0];
      if (!account) { setError("No account connected."); return; }

      setStep("Requesting challenge…");
      const chRes = await fetch("/api/developer/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, walletAddress: account }),
      });
      const chData = await chRes.json() as { challenge?: string; error?: string };
      if (!chRes.ok || !chData.challenge) { setError(chData.error ?? "Could not get challenge."); return; }

      setStep("Waiting for signature…");
      const signature = await eth.request({
        method: "personal_sign",
        params: [chData.challenge, account],
      }) as string;

      setStep("Verifying…");
      const res = await fetch("/api/developer/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, walletAddress: account, signature }),
      });
      const data = await res.json() as { tier: LucaTier; luca_balance: number; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to link wallet."); return; }
      setResult({ tier: data.tier, balance: data.luca_balance });
      onLinked(account, data.tier, data.luca_balance);
    } catch {
      setError("Signature cancelled or network error — please try again.");
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--st-bg)", borderRadius: 8, border: "1px solid var(--st-border)" }}>
      <div style={{ fontSize: 12, color: "var(--st-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>toll</span>
        {currentWallet
          ? `Linked: ${currentWallet.slice(0, 8)}…${currentWallet.slice(-6)} — re-verify to refresh tier`
          : "Connect and sign to verify your access tier"}
      </div>
      <button type="button" className="stitch-btn" onClick={handleLink} disabled={loading}>
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>account_balance_wallet</span>
        {loading ? (step || "Working…") : "Connect wallet & sign"}
      </button>
      {error && <p style={{ color: "var(--st-red)", fontSize: 12, marginTop: 6 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--st-green)" }}>check_circle</span>
          <span style={{ color: "var(--st-muted)" }}>
            Wallet verified →
          </span>
          <TierBadge tier={result.tier} />
          <span style={{ color: "var(--st-muted)" }}>{TIER_LIMITS[result.tier].toLocaleString()} req/day</span>
        </div>
      )}
      {!result && currentTier === "free" && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--st-muted)" }}>
          Developer: 500 req/day &nbsp;·&nbsp; Enterprise: 2,000 req/day
        </div>
      )}
    </div>
  );
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/keys");
      if (res.status === 401) {
        setSignedOut(true);
        setKeys([]);
        return;
      }
      setSignedOut(false);
      const data = await res.json() as { keys: ApiKeyRecord[] };
      setKeys(data.keys ?? []);
    } finally { setLoading(false); }
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
      if (res.status === 401) {
        setSignedOut(true);
        setShowForm(false);
        return;
      }
      const data = await res.json() as { key: string; record: ApiKeyRecord };
      setNewKey(data.key);
      setKeys((prev) => [data.record, ...prev]);
      setShowForm(false);
      setNewName("");
    } finally { setCreating(false); }
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

  function handleWalletLinked(keyId: string, wallet: string, tier: LucaTier) {
    setKeys((prev) => prev.map((k) =>
      k.id === keyId
        ? { ...k, wallet_address: wallet.toLowerCase(), tier, rate_limit_per_day: TIER_LIMITS[tier] }
        : k,
    ));
    setExpandedWallet(null);
  }

  return (
    <StitchShell>
      <StitchHeader
        title="Developer API"
        description="Manage API keys · Build on x402Books · Powered by x402Books AI"
      />

      {/* Tier overview */}
      <div className="stitch-stats-grid stitch-tier-grid">
        {(["free", "holder", "whale"] as LucaTier[]).map((tier) => (
          <div key={tier} className="stitch-card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <TierBadge tier={tier} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: TIER_COLORS[tier] }}>
              {TIER_LIMITS[tier].toLocaleString()}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--st-muted)", marginLeft: 4 }}>req/day</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--st-muted)", marginTop: 4 }}>
              {tier === "free" && "Free tier"}
              {tier === "holder" && "Developer access"}
              {tier === "whale" && "High-volume access"}
            </div>
          </div>
        ))}
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="stitch-card" style={{ borderColor: "var(--st-green)", background: "color-mix(in srgb, var(--st-green) 8%, var(--st-surface))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ color: "var(--st-green)", fontSize: 18 }}>check_circle</span>
            <strong style={{ color: "var(--st-green)" }}>API key created — copy it now</strong>
          </div>
          <p style={{ color: "var(--st-muted)", fontSize: 12, marginBottom: 10 }}>
            This key will not be shown again. Store it in a safe place.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, background: "var(--st-bg)", padding: "8px 12px", borderRadius: 6, fontFamily: "var(--st-mono)", fontSize: 13, border: "1px solid var(--st-border)", wordBreak: "break-all" }}>
              {newKey}
            </code>
            <button type="button" className="stitch-btn" onClick={() => copyKey(newKey)} style={{ whiteSpace: "nowrap" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button type="button" className="stitch-btn" onClick={() => setNewKey(null)} style={{ color: "var(--st-muted)" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Signed-out notice */}
      {signedOut && (
        <div className="stitch-card" style={{ borderColor: "var(--st-border)", textAlign: "center", padding: "28px 20px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--st-muted)", marginBottom: 8, display: "block" }}>key</span>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Sign in to manage API keys</p>
          <p style={{ fontSize: 12, color: "var(--st-muted)", marginBottom: 14 }}>
            API keys are tied to your access session so only you can see and revoke them.
          </p>
          <a href="/access" className="stitch-btn" style={{ display: "inline-flex" }}>
            Sign in with access code →
          </a>
        </div>
      )}

      {/* Keys list */}
      <div className="stitch-card">
        <div className="stitch-card-head">
          <h3>API Keys</h3>
          <button type="button" className="stitch-btn" onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
            New Key
          </button>
        </div>

        {showForm && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "12px 0", borderBottom: "1px solid var(--st-border)" }}>
            <input
              ref={inputRef}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--st-border)", background: "var(--st-bg)", color: "var(--st-text)", fontSize: 13 }}
              placeholder="Key name (e.g. My Agent)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowForm(false); }}
              maxLength={64}
            />
            <button type="button" className="stitch-btn" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create"}
            </button>
            <button type="button" className="stitch-btn" onClick={() => setShowForm(false)} style={{ color: "var(--st-muted)" }}>Cancel</button>
          </div>
        )}

        {loading ? (
          <div style={{ color: "var(--st-muted)", fontSize: 13, padding: "12px 0" }}>Loading keys…</div>
        ) : keys.length === 0 ? (
          <StitchEmpty compact>No API keys yet. Create one to get started.</StitchEmpty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {keys.map((key) => (
              <div key={key.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--st-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <strong style={{ fontSize: 14 }}>{key.name}</strong>
                      <code style={{ fontSize: 11, color: "var(--st-muted)", fontFamily: "var(--st-mono)" }}>{key.key_prefix}…</code>
                      <TierBadge tier={key.tier ?? "free"} />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--st-muted)" }}>
                      <span>Created {relDate(key.created_at)}</span>
                      <span>Last used: {relDate(key.last_used_at)}</span>
                      <span>{key.requests_total.toLocaleString()} total</span>
                      {key.wallet_address && (
                        <span style={{ fontFamily: "var(--st-mono)", fontSize: 11 }}>
                          {key.wallet_address.slice(0, 6)}…{key.wallet_address.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Daily usage bar */}
                  <div style={{ width: 110, textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--st-muted)", marginBottom: 3 }}>
                      {key.requests_today} / {key.rate_limit_per_day} today
                    </div>
                    <div style={{ height: 4, background: "var(--st-border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min(100, (key.requests_today / key.rate_limit_per_day) * 100)}%`,
                        background: key.requests_today >= key.rate_limit_per_day ? "var(--st-red)" : TIER_COLORS[key.tier ?? "free"],
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>

                  {/* Upgrade / wallet button */}
                  <button
                    type="button"
                    className="stitch-btn"
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                    onClick={() => setExpandedWallet(expandedWallet === key.id ? null : key.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>toll</span>
                    {key.wallet_address ? "Re-verify" : "Link Wallet"}
                  </button>

                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 99,
                    background: "color-mix(in srgb, var(--st-green) 15%, transparent)",
                    color: "var(--st-green)",
                  }}>Active</span>

                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--st-red)", padding: 4 }}
                    title="Revoke key"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>
                  </button>
                </div>

                {expandedWallet === key.id && (
                  <WalletLinker
                    keyId={key.id}
                    currentWallet={key.wallet_address}
                    currentTier={key.tier ?? "free"}
                    onLinked={(wallet, tier) => handleWalletLinked(key.id, wallet, tier)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Endpoint reference */}
      <div className="stitch-card">
        <div className="stitch-card-head">
          <h3>Endpoints</h3>
          <span style={{ fontSize: 12, color: "var(--st-muted)" }}>
            Base URL: <code style={{ fontFamily: "var(--st-mono)" }}>https://x402books.ai/api/v1</code>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            { method: "GET",  path: "/ledger-summary",       desc: "Income, spend, net flow, budget status",                params: "wallet, range" },
            { method: "GET",  path: "/transactions",          desc: "Paginated transactions with USD values + categories",   params: "wallet, range, page, limit" },
            { method: "GET",  path: "/full-report",           desc: "Complete scan: portfolio, daily flows, categories",     params: "wallet, range" },
            { method: "POST", path: "/categorize",            desc: "AI-powered transaction categorization (Claude)",        params: "{ wallet, range }" },
            { method: "GET",  path: "/agent-financial-state", desc: "Agent snapshot: ecosystem, portfolio, x402 activity",  params: "wallet, range" },
          ].map((ep) => (
            <div key={ep.path} style={{
              display: "grid", gridTemplateColumns: "60px 220px 1fr auto",
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

        <div style={{ marginTop: 16, padding: 12, background: "var(--st-bg)", borderRadius: 8, border: "1px solid var(--st-border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--st-muted)", marginBottom: 4 }}>Authentication</div>
            <code style={{ fontFamily: "var(--st-mono)", fontSize: 12 }}>Authorization: Bearer xb_live_…</code>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--st-muted)", marginBottom: 4 }}>Or</div>
            <code style={{ fontFamily: "var(--st-mono)", fontSize: 12 }}>X-API-Key: xb_live_…</code>
          </div>
        </div>
      </div>
    </StitchShell>
  );
}
