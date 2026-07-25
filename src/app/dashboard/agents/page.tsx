"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type Anomaly = { type: string; severity: "low" | "medium" | "high"; description: string; detected_at: string };

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

function roleColor(role: string): string {
  if (role === "treasury") return "var(--accent)";
  if (role === "fee_recipient" || role === "fee") return "#5B9EF4";
  if (role === "revenue") return "var(--accent)";
  if (role === "deployer") return "#8B7CF6";
  if (role === "operator") return "#F4B942";
  return "var(--muted)";
}

export default function MyAgentsPage() {
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [anomalyMap, setAnomalyMap] = useState<Record<string, Anomaly[]>>({});
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

          const slugs = matched.map((a) => a.slug ?? toSlug(a.name));
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

  const totalWallets = myAgents.reduce((s, a) => s + (a.wallets?.length ?? 0), 0);
  const totalVerified = myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length;
  const totalSignals = Object.values(anomalyMap).flat().filter((a) => a.severity === "high" || a.severity === "medium").length;

  return (
    <div className="op-page">
      {/* ── Header ── */}
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">My Agents</h1>
          <p className="op-page-sub">Agents attributed to your linked wallet.</p>
        </div>
        <Link href="/register" className="op-btn op-btn-primary">+ Register Agent</Link>
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
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", padding: "48px 24px", textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 16px",
            borderRadius: "50%", background: "var(--surface-soft)",
            border: "1px solid var(--line)", display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--muted)",
          }}>
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="20" cy="14" r="7" /><path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)", margin: "0 0 6px" }}>No agents linked</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Register your agent with a wallet manifest to see it here. Verification completes in 24–48 hours.
          </p>
          <Link href="/register" className="op-btn op-btn-primary">Register your agent →</Link>
        </div>
      ) : (
        <>
          {/* ── Stat strip ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "My Agents", value: myAgents.length, sub: "linked to wallet", accent: true },
              { label: "Verified", value: totalVerified, sub: `of ${myAgents.length} agents`, color: totalVerified > 0 ? "var(--accent)" : undefined },
              { label: "Total Wallets", value: totalWallets, sub: "declared across agents" },
              { label: "Active Signals", value: totalSignals, sub: totalSignals > 0 ? "require attention" : "all clear", color: totalSignals > 0 ? "#F4B942" : undefined },
            ].map((t) => (
              <div key={t.label} style={{
                flex: 1, minWidth: 110,
                padding: "14px 18px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderLeft: t.accent ? "3px solid var(--accent)" : undefined,
                borderRadius: "var(--radius-card)",
              }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>{t.label}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: t.color ?? "var(--ink)" }}>{t.value}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{t.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Agent cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myAgents.map((agent) => {
              const slug = agent.slug ?? toSlug(agent.name);
              const agentAnomalies = (anomalyMap[slug] ?? []).filter((a) => a.severity === "high" || a.severity === "medium");
              return (
                <div key={agent.name} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card)",
                  overflow: "hidden",
                  transition: "border-color 0.15s",
                }}>
                  {/* Card top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 18px 14px", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)", marginBottom: 6 }}>
                        {agent.name}
                        {agent.symbol && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--muted)", marginLeft: 8 }}>{agent.symbol}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <StatusBadge variant={verificationVariant(agent.verificationStatus)}>{agent.verificationStatus}</StatusBadge>
                        <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{agent.ecosystem}</span>
                        <span style={{
                          fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--muted)",
                          background: "var(--surface-soft)", border: "1px solid var(--line)",
                          borderRadius: "var(--radius-sm)", padding: "1px 6px",
                        }}>
                          {agent.wallets?.length ?? 0} wallet{(agent.wallets?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      {agentAnomalies.length > 0 && (
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "4px 10px",
                          borderRadius: "var(--radius-md)",
                          background: "color-mix(in srgb, #F4B942 10%, transparent)",
                          border: "1px solid color-mix(in srgb, #F4B942 30%, transparent)",
                          color: "#F4B942",
                        }}>
                          ⚠ {agentAnomalies.length} signal{agentAnomalies.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 10px" }}>Ask Luca</Link>
                      <Link href={`/registry/${slug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem", padding: "4px 10px" }} target="_blank">Profile ↗</Link>
                    </div>
                  </div>

                  {/* Wallet table */}
                  {(agent.wallets?.length ?? 0) > 0 && (
                    <div style={{ borderTop: "1px solid var(--line)" }}>
                      {agent.wallets.map((w, wi) => (
                        <div key={w.address} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 18px",
                          borderBottom: wi < agent.wallets.length - 1 ? "1px solid var(--line)" : "none",
                          background: wi % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--surface-soft) 40%, transparent)",
                        }}>
                          <span style={{
                            fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--surface-soft)", border: "1px solid var(--line)",
                            color: roleColor(w.role ?? "unknown"),
                            fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>
                            {w.role ?? "unknown"}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {w.address}
                          </span>
                          {w.label && (
                            <span style={{ fontSize: "0.7rem", color: "var(--muted)", flexShrink: 0 }}>{w.label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
