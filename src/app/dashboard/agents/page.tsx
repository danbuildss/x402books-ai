"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LedgerCard, LedgerRow } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

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

function verificationVariant(status: string): "verified" | "luca-managed" | "wallets-declared" | "claimed" | "neutral" {
  if (status === "Verified") return "verified";
  if (status === "Luca Managed") return "luca-managed";
  if (status === "Wallets Declared") return "wallets-declared";
  if (status === "Claimed") return "claimed";
  return "neutral";
}

function healthVariant(health: string): "green" | "blue" | "amber" | "neutral" {
  if (health === "Active") return "green";
  if (health === "Stable") return "blue";
  if (health === "Unverified") return "amber";
  return "neutral";
}

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

      {loading ? (
        <div style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "32px 0" }}>Loading agents…</div>
      ) : myAgents.length === 0 ? (
        <div className="op-card">
          <div className="op-empty">
            <svg className="op-empty-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="20" cy="14" r="7" /><path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" />
            </svg>
            <p className="op-empty-title">No agents linked</p>
            <p className="op-empty-desc">Submit your agent or declare your wallet address in an existing agent&apos;s manifest to see it here.</p>
            <Link href="/dashboard/attribution" className="op-btn op-btn-primary">Declare Attribution →</Link>
          </div>
        </div>
      ) : (
        <LedgerCard eyebrow="Registry" title={`${myAgents.length} Agent${myAgents.length !== 1 ? "s" : ""}`}>
          {myAgents.map((agent, i) => {
            const slug = agent.slug ?? toSlug(agent.name);
            return (
              <LedgerRow
                key={agent.name}
                first={i === 0}
                last={i === myAgents.length - 1}
                label={
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.84rem" }}>{agent.name}</div>
                    {agent.symbol && (
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{agent.symbol}</div>
                    )}
                  </div>
                }
                badge={<StatusBadge variant={verificationVariant(agent.verificationStatus)}>{agent.verificationStatus}</StatusBadge>}
                detail={
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{agent.ecosystem}</span>
                    {agent.treasuryHealth && (
                      <StatusBadge variant={healthVariant(agent.treasuryHealth)}>{agent.treasuryHealth}</StatusBadge>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                      {agent.wallets?.length ?? 0} wallet{(agent.wallets?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                }
                value={
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Ask Luca</Link>
                    <Link href={`/registry/${slug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem", padding: "4px 8px" }} target="_blank">Profile ↗</Link>
                  </div>
                }
                style={{ alignItems: "flex-start", padding: "12px 14px" }}
              />
            );
          })}
        </LedgerCard>
      )}
    </div>
  );
}
