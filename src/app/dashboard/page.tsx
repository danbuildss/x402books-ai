"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { StitchHeader, StitchShell } from "@/components/stitch-app";
import { toSlug } from "@/app/registry/[slug]/slug";

type AgentProfile = {
  name: string;
  symbol: string | null;
  ecosystem: string | null;
  verificationStatus: string;
  treasuryHealth: string;
  wallets: { address: string; label: string }[];
  xHandle: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  Verified:       "var(--st-green)",
  "Luca Managed": "var(--st-green)",
  "Needs Verification": "#f59e0b",
  Candidate:      "var(--st-muted)",
};

// Descriptive status — no judgment implied
const HEALTH_COLOR: Record<string, string> = {
  Active:     "var(--st-green)",
  Stable:     "var(--st-green)",
  Inactive:   "var(--st-muted)",
  Unverified: "#f59e0b",
  Pending:    "var(--st-muted)",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--st-muted)";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
    }}>
      {status}
    </span>
  );
}

function AgentCard({ agent }: { agent: AgentProfile }) {
  const slug = toSlug(agent.name);
  const healthColor = HEALTH_COLOR[agent.treasuryHealth] ?? "var(--st-muted)";

  return (
    <div style={{ background: "var(--st-surface)", border: "1px solid var(--st-border)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--st-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <strong style={{ fontSize: 16, color: "var(--st-text)" }}>{agent.name}</strong>
          {agent.symbol && <span style={{ fontSize: 12, color: "var(--st-muted)" }}>{agent.symbol}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusPill status={agent.verificationStatus} />
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99,
            background: `color-mix(in srgb, ${healthColor} 14%, transparent)`,
            color: healthColor, border: `1px solid color-mix(in srgb, ${healthColor} 25%, transparent)`,
          }}>{agent.treasuryHealth}</span>
          {agent.ecosystem && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "var(--st-bg)", color: "var(--st-muted)", border: "1px solid var(--st-border)" }}>
              {agent.ecosystem}
            </span>
          )}
        </div>
      </div>

      {/* Wallets */}
      {agent.wallets.length > 0 && (
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--st-border)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--st-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Declared Wallets</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {agent.wallets.slice(0, 4).map((w) => (
              <div key={w.address} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
                <span style={{ color: "var(--st-green)", fontWeight: 600, minWidth: 120 }}>{w.label}</span>
                <code style={{ color: "var(--st-muted)", fontFamily: "monospace", fontSize: 11 }}>
                  {w.address.slice(0, 10)}…{w.address.slice(-6)}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
        <Link href={`/registry/${slug}`} target="_blank"
          style={{ fontSize: 12, fontWeight: 600, color: "var(--st-green)", textDecoration: "none", padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(109,184,116,0.3)", background: "color-mix(in srgb, var(--st-green) 8%, transparent)" }}>
          View public profile →
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "color-mix(in srgb, var(--st-green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-green) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--st-green)" }}>manage_accounts</span>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--st-text)", marginBottom: 8 }}>No agent linked yet</h2>
      <p style={{ fontSize: 14, color: "var(--st-muted)", lineHeight: 1.6, marginBottom: 24 }}>
        Find your agent in the registry and claim your profile. Once claimed, you can submit a wallet manifest, track verification status, and share your embeddable card.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/registry"
          style={{ fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none", padding: "8px 18px", borderRadius: 8, background: "var(--st-green)" }}>
          Browse Registry
        </Link>
        <Link href="/registry#verify"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--st-muted)", textDecoration: "none", padding: "8px 18px", borderRadius: 8, border: "1px solid var(--st-border)", background: "var(--st-bg)" }}>
          Submit Wallet Manifest
        </Link>
      </div>
    </div>
  );
}

function VerificationSteps({ status }: { status: string }) {
  const steps = [
    { key: "Candidate",         label: "Candidate",        desc: "Agent indexed from public data" },
    { key: "Wallets Declared",  label: "Wallets Declared", desc: "Wallet manifest submitted" },
    { key: "Verified",          label: "Verified",         desc: "Luca-reviewed and confirmed" },
    { key: "Live Financial Data", label: "Live Data",      desc: "Active on-chain data tracked" },
  ];

  const order = ["Candidate", "Wallets Declared", "Verified", "Live Financial Data"];
  const currentIdx = order.indexOf(status === "Needs Verification" ? "Candidate" : status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((s, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={s.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < steps.length - 1 ? 16 : 0, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                background: done ? "var(--st-green)" : "var(--st-bg)",
                color: done ? "#fff" : "var(--st-muted)",
                border: `2px solid ${current ? "var(--st-green)" : done ? "var(--st-green)" : "var(--st-border)"}`,
              }}>
                {done && !current ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 12, background: done ? "var(--st-green)" : "var(--st-border)", marginTop: 2 }} />}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: current ? "var(--st-green)" : done ? "var(--st-text)" : "var(--st-muted)", margin: "0 0 2px" }}>{s.label}</p>
              <p style={{ fontSize: 12, color: "var(--st-muted)", margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyAgentPage() {
  const { user } = usePrivy();
  const [agentName, setAgentName] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ name: string; symbol: string | null }[]>([]);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detected, setDetected] = useState<AgentProfile | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Get connected wallet address from Privy
  const connectedWallet = (
    user?.linkedAccounts?.find((a) => a.type === "wallet") as { address?: string } | undefined
  )?.address?.toLowerCase();

  // On load: check localStorage first, then try wallet-based detection
  useEffect(() => {
    const saved = localStorage.getItem("x402books_my_agent");
    if (saved) { loadAgent(saved); return; }
  }, []);

  // When wallet connects and no agent is linked yet, try to detect via wallet match
  useEffect(() => {
    if (!connectedWallet || agent || localStorage.getItem("x402books_my_agent")) return;
    setDetecting(true);
    fetch("/api/registry/agents")
      .then((r) => r.json())
      .then((d: { agents?: AgentProfile[] }) => {
        const match = (d.agents ?? []).find((a) =>
          a.wallets.some((w) => w.address.toLowerCase() === connectedWallet)
        );
        if (match) setDetected(match);
      })
      .catch(() => {})
      .finally(() => setDetecting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedWallet]);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/agent/search?q=${encodeURIComponent(query)}`);
        const data = await res.json() as { results: { name: string; symbol: string | null; walletAddress: string }[] };
        setResults((data.results ?? []).map((r) => ({ name: r.name, symbol: r.symbol })));
      } catch { /* silent */ } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function loadAgent(name: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/registry/agents?name=${encodeURIComponent(name)}`);
      const data = await res.json() as { agents?: AgentProfile[]; ok?: boolean };
      const found = (data.agents ?? []).find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (found) {
        setAgent(found);
        setAgentName(found.name);
        localStorage.setItem("x402books_my_agent", found.name);
      } else {
        setError("Agent not found in registry.");
      }
    } catch {
      setError("Could not load agent profile.");
    } finally { setLoading(false); }
  }

  function pick(name: string) {
    setQuery("");
    setResults([]);
    loadAgent(name);
  }

  function claimDetected() {
    if (!detected) return;
    setDetected(null);
    setAgent(detected);
    setAgentName(detected.name);
    localStorage.setItem("x402books_my_agent", detected.name);
  }

  function unlink() {
    setAgent(null);
    setAgentName("");
    setDetected(null);
    localStorage.removeItem("x402books_my_agent");
  }

  return (
    <StitchShell>
      <StitchHeader
        title="My Agent"
        description="Your agent's financial identity — profile status, wallets, and verification."
      />

      <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Wallet-detected agent banner */}
        {!agent && detected && (
          <div style={{ background: "color-mix(in srgb, var(--st-green) 8%, var(--st-surface))", border: "1px solid color-mix(in srgb, var(--st-green) 25%, transparent)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--st-green)", flexShrink: 0 }}>verified</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--st-text)", marginBottom: 2 }}>
                We found your agent: <span style={{ color: "var(--st-green)" }}>{detected.name}</span>
              </p>
              <p style={{ fontSize: 12, color: "var(--st-muted)" }}>
                Your connected wallet matches a declared wallet for this agent.
              </p>
            </div>
            <button type="button" onClick={claimDetected}
              style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--st-green)", border: "none", borderRadius: 7, padding: "7px 16px", cursor: "pointer", whiteSpace: "nowrap" }}>
              Claim Agent
            </button>
          </div>
        )}

        {/* Detecting */}
        {!agent && !detected && detecting && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--st-muted)", padding: "8px 0" }}>
            <span className="stitch-agent-spinner" />
            Checking your wallet against the registry…
          </div>
        )}

        {/* Search / link agent */}
        {!agent && (
          <div style={{ background: "var(--st-surface)", border: "1px solid var(--st-border)", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--st-text)", marginBottom: 4 }}>Find your agent</p>
            <p style={{ fontSize: 12, color: "var(--st-muted)", marginBottom: 12 }}>Search by agent name or token symbol to link your agent profile.</p>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search agents…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--st-border)", background: "var(--st-bg)", color: "var(--st-text)", fontSize: 13, boxSizing: "border-box" }}
              />
              {searching && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--st-muted)" }}>Searching…</span>}
              {results.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--st-surface)", border: "1px solid var(--st-border)", borderRadius: 8, marginTop: 4, zIndex: 10, overflow: "hidden" }}>
                  {results.slice(0, 6).map((r) => (
                    <button key={r.name} type="button" onClick={() => pick(r.name)}
                      style={{ width: "100%", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--st-border)" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--st-text)" }}>{r.name}</span>
                      {r.symbol && <span style={{ fontSize: 11, color: "var(--st-muted)" }}>{r.symbol}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
            {loading && <p style={{ fontSize: 12, color: "var(--st-muted)", marginTop: 8 }}>Loading profile…</p>}
          </div>
        )}

        {/* Linked agent view */}
        {agent ? (
          <>
            {/* Agent name + unlink */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: "var(--st-muted)" }}>Linked agent: <strong style={{ color: "var(--st-text)" }}>{agentName}</strong></p>
              <button type="button" onClick={unlink}
                style={{ fontSize: 11, color: "var(--st-muted)", background: "none", border: "1px solid var(--st-border)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                Unlink
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16, alignItems: "start" }}>
              <AgentCard agent={agent} />

              {/* Verification progress */}
              <div style={{ background: "var(--st-surface)", border: "1px solid var(--st-border)", borderRadius: 12, padding: "16px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--st-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Verification Path</p>
                <VerificationSteps status={agent.verificationStatus} />
                {agent.verificationStatus !== "Verified" && agent.verificationStatus !== "Luca Managed" && (
                  <Link href="/registry#verify"
                    style={{ display: "block", marginTop: 16, fontSize: 12, fontWeight: 600, color: "var(--st-green)", textDecoration: "none", textAlign: "center", padding: "7px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "color-mix(in srgb, var(--st-green) 8%, transparent)" }}>
                    Submit wallet manifest →
                  </Link>
                )}
              </div>
            </div>
          </>
        ) : (
          !loading && <EmptyState />
        )}
      </div>
    </StitchShell>
  );
}
