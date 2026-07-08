"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Agent = {
  name: string;
  slug: string;
  ecosystem: string;
  verificationStatus: string;
  wallets: { address: string; label?: string }[];
};

type Anomaly = {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  detected_at: string;
};

type RegistryResponse = {
  agents: Agent[];
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const STATUS_COLORS: Record<string, string> = {
  Verified: "#6DB874",
  "Luca Managed": "#6DB874",
  "Wallets Declared": "#5B8FA8",
  Claimed: "#F97316",
  Candidate: "var(--muted)",
};

export default function OverviewPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [anomalyMap, setAnomalyMap] = useState<Record<string, Anomaly[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, agentsRes] = await Promise.all([
          fetch("/api/user/wallet"),
          fetch("/api/registry/agents"),
        ]);
        const walletData = await walletRes.json() as { wallet: string | null };
        const agentsData = await agentsRes.json() as RegistryResponse;

        const linked = walletData.wallet?.toLowerCase() ?? null;
        setWallet(linked);

        if (linked) {
          const matched = agentsData.agents.filter((a) =>
            a.wallets?.some((w) => w.address.toLowerCase() === linked)
          );
          setMyAgents(matched);

          // Fetch anomalies for each linked agent in parallel
          const slugs = matched.map((a) => toSlug(a.name));
          const anomalyResults = await Promise.all(
            slugs.map((s) =>
              fetch(`/api/agent-anomalies/${s}`)
                .then((r) => r.json() as Promise<{ anomalies: Anomaly[] }>)
                .then((d) => ({ slug: s, anomalies: d.anomalies ?? [] }))
                .catch(() => ({ slug: s, anomalies: [] }))
            )
          );
          const map: Record<string, Anomaly[]> = {};
          for (const r of anomalyResults) map[r.slug] = r.anomalies;
          setAnomalyMap(map);
        }
      } catch { /* unavailable */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const totalAnomalies = Object.values(anomalyMap).flat().filter(
    (a) => a.severity === "high" || a.severity === "medium"
  ).length;

  if (loading) {
    return (
      <div className="op-page">
        <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Loading workspace…</div>
      </div>
    );
  }

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Overview</h1>
        <p className="op-page-sub">Your workspace at a glance.</p>
      </div>

      {/* Attention items */}
      {!wallet && (
        <div className="op-alert op-alert-warn">
          <span style={{ fontSize: "1rem" }}>⚠</span>
          <div>
            <strong>Wallet not linked.</strong> Link your wallet to attribute agents to your workspace and unlock API tier upgrades.{" "}
            <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>Go to Settings →</Link>
          </div>
        </div>
      )}

      {wallet && myAgents.length === 0 && (
        <div className="op-alert op-alert-info">
          <span style={{ fontSize: "1rem" }}>ℹ</span>
          <div>
            No agents linked to your wallet yet. <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit or claim your agent →</Link>
          </div>
        </div>
      )}

      {/* Anomaly alert banner */}
      {totalAnomalies > 0 && (
        <div className="op-alert" style={{
          background: "color-mix(in srgb, #f59e0b 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
          borderLeft: "3px solid #f59e0b",
          color: "var(--ink)",
        }}>
          <span style={{ fontSize: "1rem", color: "#f59e0b" }}>⚠</span>
          <div>
            <strong>{totalAnomalies} active signal{totalAnomalies > 1 ? "s" : ""} detected</strong> across your agents.{" "}
            {Object.entries(anomalyMap)
              .filter(([, a]) => a.some((x) => x.severity === "high" || x.severity === "medium"))
              .map(([slug]) => (
                <Link key={slug} href={`/registry/${slug}`} style={{ color: "var(--accent)", marginRight: 8 }}>
                  {slug} →
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="op-stat-grid">
        <div className="op-stat">
          <p className="op-stat-label">My Agents</p>
          <p className="op-stat-value">{myAgents.length}</p>
          <p className="op-stat-sub">{wallet ? "linked to your wallet" : "wallet not linked"}</p>
        </div>
        <div className="op-stat">
          <p className="op-stat-label">Attribution</p>
          <p className="op-stat-value">
            {myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>verified</span>
          </p>
          <p className="op-stat-sub">of {myAgents.length} agents</p>
        </div>
        <div className="op-stat">
          <p className="op-stat-label">Active Signals</p>
          <p className="op-stat-value" style={{ color: totalAnomalies > 0 ? "#f59e0b" : "var(--ink)" }}>
            {totalAnomalies}
          </p>
          <p className="op-stat-sub">{totalAnomalies > 0 ? "require attention" : "all clear"}</p>
        </div>
        <div className="op-stat">
          <p className="op-stat-label">Quick Links</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            <Link href="/dashboard/keys" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>API Keys →</Link>
            <Link href="/dashboard/luca" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>Ask Luca →</Link>
          </div>
        </div>
      </div>

      {/* My Agents summary */}
      {myAgents.length > 0 && (
        <div className="op-card">
          <div className="op-card-head">
            <h2 className="op-card-title">My Agents</h2>
            <Link href="/dashboard/agents" className="op-btn" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>View all →</Link>
          </div>
          <table className="op-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Ecosystem</th>
                <th>Status</th>
                <th>Signals</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {myAgents.slice(0, 5).map((agent) => {
                const slug = toSlug(agent.name);
                const color = STATUS_COLORS[agent.verificationStatus] ?? "var(--muted)";
                const agentAnomalies = (anomalyMap[slug] ?? []).filter(
                  (a) => a.severity === "high" || a.severity === "medium"
                );
                return (
                  <tr key={agent.name}>
                    <td style={{ fontWeight: 600 }}>{agent.name}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.76rem" }}>{agent.ecosystem}</td>
                    <td>
                      <span className="op-badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                        {agent.verificationStatus}
                      </span>
                    </td>
                    <td>
                      {agentAnomalies.length > 0 ? (
                        <span className="op-badge" style={{
                          background: "color-mix(in srgb, #f59e0b 14%, transparent)",
                          color: "#f59e0b",
                          fontSize: "0.7rem",
                        }}>
                          ⚠ {agentAnomalies.length}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Ask Luca</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Getting started */}
      {myAgents.length === 0 && (
        <div className="op-card">
          <h2 className="op-card-title" style={{ marginBottom: 16 }}>Get started</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { step: "01", title: "Link your wallet", desc: "Connect your wallet to identify which registry agents belong to your workspace.", href: "/dashboard/settings", cta: "Go to Settings" },
              { step: "02", title: "Declare your agent", desc: "Submit a wallets.json manifest to attribute on-chain activity to your agent.", href: "/dashboard/attribution", cta: "Open Attribution" },
              { step: "03", title: "Get your API key", desc: "Generate an API key to query your agent's financial data programmatically.", href: "/dashboard/keys", cta: "Open API Keys" },
            ].map((s) => (
              <div key={s.step} style={{ padding: 16, background: "var(--surface-soft)", borderRadius: 8 }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Step {s.step}</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: "0.77rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>{s.desc}</div>
                <Link href={s.href} className="op-btn" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>{s.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
