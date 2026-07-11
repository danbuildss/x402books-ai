"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Wallet = { address: string; label?: string; role?: string };
type Agent = {
  name: string;
  slug?: string;
  ecosystem: string;
  verificationStatus: string;
  wallets: Wallet[];
  treasuryHealth?: string;
  symbol?: string;
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const ECO_COLORS: Record<string, string> = {
  BANKR: "#4AE8A0", Virtuals: "#5B8FA8", AEON: "#8B7CF6", EigenCloud: "#F97316", Base: "#5B9EF4",
};

const STATUS_COLORS: Record<string, string> = {
  Verified: "#4AE8A0", "Luca Managed": "#4AE8A0", "Wallets Declared": "#5B8FA8",
  Claimed: "#F97316", Candidate: "var(--muted)",
};

const HEALTH_COLORS: Record<string, string> = {
  Active: "#4AE8A0", Stable: "#5B8FA8", Unverified: "#F97316", Inactive: "var(--muted)", Pending: "var(--muted)",
};

export default function MyAgentsPage() {
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, agentsRes] = await Promise.all([
          fetch("/api/user/wallet"),
          fetch("/api/registry/agents"),
        ]);
        const walletData = await walletRes.json() as { wallet: string | null };
        const agentsData = await agentsRes.json() as { agents: Agent[] };
        const linked = walletData.wallet?.toLowerCase() ?? null;
        setWallet(linked);
        if (linked) {
          const matched = agentsData.agents.filter((a) =>
            a.wallets?.some((w) => w.address.toLowerCase() === linked)
          );
          setMyAgents(matched);
        }
      } catch { /* unavailable */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="op-page">
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">My Agents</h1>
          <p className="op-page-sub">Agents attributed to your linked wallet.</p>
        </div>
        <Link href="/dashboard/attribution" className="op-btn op-btn-primary">+ Submit Agent</Link>
      </div>

      {!wallet && !loading && (
        <div className="op-alert op-alert-warn">
          <span>⚠</span>
          <div>No wallet linked. <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>Link your wallet in Settings</Link> to see your agents.</div>
        </div>
      )}

      <div className="op-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 32, color: "var(--muted)", fontSize: "0.82rem" }}>Loading agents…</div>
        ) : myAgents.length === 0 ? (
          <div className="op-empty">
            <svg className="op-empty-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="20" cy="14" r="7" /><path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" />
            </svg>
            <p className="op-empty-title">No agents linked</p>
            <p className="op-empty-desc">Submit your agent or declare your wallet address in an existing agent&apos;s manifest to see it here.</p>
            <Link href="/dashboard/attribution" className="op-btn op-btn-primary">Declare Attribution →</Link>
          </div>
        ) : (
          <table className="op-table" style={{ padding: "0 20px" }}>
            <thead>
              <tr style={{ padding: "0 20px" }}>
                <th style={{ paddingLeft: 20 }}>Agent</th>
                <th>Ecosystem</th>
                <th>Status</th>
                <th>Treasury</th>
                <th>Wallets</th>
                <th style={{ paddingRight: 20 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myAgents.map((agent) => {
                const slug = agent.slug ?? toSlug(agent.name);
                const ecoColor = ECO_COLORS[agent.ecosystem] ?? "var(--muted)";
                const statusColor = STATUS_COLORS[agent.verificationStatus] ?? "var(--muted)";
                const healthColor = HEALTH_COLORS[agent.treasuryHealth ?? ""] ?? "var(--muted)";
                return (
                  <tr key={agent.name}>
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ecoColor, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.84rem" }}>{agent.name}</div>
                          {agent.symbol && <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{agent.symbol}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.76rem" }}>{agent.ecosystem}</td>
                    <td>
                      <span className="op-badge" style={{ background: `color-mix(in srgb, ${statusColor} 14%, transparent)`, color: statusColor }}>
                        {agent.verificationStatus}
                      </span>
                    </td>
                    <td>
                      {agent.treasuryHealth ? (
                        <span style={{ fontSize: "0.76rem", color: healthColor }}>{agent.treasuryHealth}</span>
                      ) : (
                        <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--muted)" }}>
                      {agent.wallets?.length ?? 0}
                    </td>
                    <td style={{ paddingRight: 20 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Ask Luca</Link>
                        <Link href={`/registry/${slug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem", padding: "4px 8px" }} target="_blank">Profile ↗</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
