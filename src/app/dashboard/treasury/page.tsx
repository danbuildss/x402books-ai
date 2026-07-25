"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard, MetricGrid } from "@/components/ui/metric";
import { LedgerCard, LedgerRow } from "@/components/ui/ledger";
import { StatusBadge } from "@/components/ui/badge";

type Agent = {
  name: string;
  slug: string;
  ecosystem: string;
  wallets: { address: string; label?: string }[];
};

type TreasuryEntry = {
  agent: Agent;
  slug: string;
  treasuryUsd: number | null;
  burnRateUsd: number | null;   // 30d expenses / 30
  revenueUsd: number | null;    // 30d revenue
  netDaily: number | null;      // revenue - expenses per day
  runwayDays: number | null;    // treasury / daily burn (null = infinite or unknown)
  status: "healthy" | "watch" | "critical" | "unknown";
  loading: boolean;
};

type BooksResponse = {
  attributed: boolean;
  financials?: {
    revenue_usd: number;
    expenses_usd: number;
    treasury_balance_usd: number;
  };
  reason?: string;
};

type WalletResponse = { wallet: string | null };
type RegistryResponse = { agents: Agent[] };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmtUsd(n: number | null) {
  if (n === null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function runwayLabel(days: number | null, netDaily: number | null) {
  if (days === null) {
    if (netDaily !== null && netDaily >= 0) return "∞  Profitable";
    return "—";
  }
  if (days >= 365) return `${Math.round(days / 30)}mo+`;
  if (days >= 30)  return `${Math.round(days / 30)}mo`;
  return `${Math.round(days)}d`;
}

function statusVariant(status: TreasuryEntry["status"]): "green" | "amber" | "red" | "neutral" {
  if (status === "healthy")  return "green";
  if (status === "watch")    return "amber";
  if (status === "critical") return "red";
  return "neutral";
}

function computeStatus(entry: Omit<TreasuryEntry, "status" | "loading" | "agent" | "slug">): TreasuryEntry["status"] {
  if (entry.runwayDays === null && entry.netDaily !== null && entry.netDaily >= 0) return "healthy";
  if (entry.runwayDays === null) return "unknown";
  if (entry.runwayDays < 14)  return "critical";
  if (entry.runwayDays < 60)  return "watch";
  return "healthy";
}

export default function TreasuryPage() {
  const [entries, setEntries]   = useState<TreasuryEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [wallet, setWallet]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, aRes] = await Promise.all([
          fetch("/api/user/wallet"),
          fetch("/api/registry/agents"),
        ]);
        const wData = await wRes.json() as WalletResponse;
        const aData = await aRes.json() as RegistryResponse;
        const linked = wData.wallet?.toLowerCase() ?? null;
        setWallet(linked);

        if (!linked) { setLoading(false); return; }

        const myAgents = aData.agents.filter((a) =>
          a.wallets?.some((w) => w.address.toLowerCase() === linked)
        );

        if (!myAgents.length) { setLoading(false); return; }

        // Init with loading state
        setEntries(myAgents.map((a) => ({
          agent: a, slug: toSlug(a.name),
          treasuryUsd: null, burnRateUsd: null, revenueUsd: null, netDaily: null, runwayDays: null,
          status: "unknown", loading: true,
        })));

        // Fetch books for each agent
        await Promise.all(myAgents.map(async (agent) => {
          const slug = toSlug(agent.name);
          try {
            const res  = await fetch(`/api/registry/agents/${slug}/books?period=30d`);
            const data = await res.json() as BooksResponse;

            if (!data.attributed || !data.financials) {
              setEntries((prev) => prev.map((e) => e.slug === slug ? { ...e, loading: false, status: "unknown" } : e));
              return;
            }

            const { revenue_usd, expenses_usd, treasury_balance_usd } = data.financials;
            const burnRateUsd = expenses_usd / 30;
            const revenueUsd  = revenue_usd;
            const netDaily    = (revenue_usd - expenses_usd) / 30;
            const runwayDays  = burnRateUsd > 0 ? treasury_balance_usd / burnRateUsd : null;
            const partial     = { treasuryUsd: treasury_balance_usd, burnRateUsd, revenueUsd, netDaily, runwayDays };

            setEntries((prev) => prev.map((e) => e.slug === slug
              ? { ...e, ...partial, loading: false, status: computeStatus(partial) }
              : e
            ));
          } catch {
            setEntries((prev) => prev.map((e) => e.slug === slug ? { ...e, loading: false } : e));
          }
        }));
      } catch { /* unavailable */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return <div className="op-page"><div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Loading treasury data…</div></div>;
  }

  return (
    <div className="op-page">
      <div className="op-page-header">
        <h1 className="op-page-title">Treasury Health</h1>
        <p className="op-page-sub">Balance, burn rate, and runway for your agents.</p>
      </div>

      {!wallet && (
        <div className="op-alert op-alert-warn">
          <span>⚠</span>
          <div>Wallet not linked. <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>Go to Settings →</Link></div>
        </div>
      )}

      {wallet && entries.length === 0 && (
        <div className="op-alert op-alert-info">
          <span>ℹ</span>
          <div>No agents linked to your wallet. <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit attribution →</Link></div>
        </div>
      )}

      {entries.length > 0 && (
        <>
          {/* Summary tiles */}
          <MetricGrid cols={4} style={{ marginBottom: 24 }}>
            <MetricCard
              label="Total Treasury"
              value={fmtUsd(entries.reduce((s, e) => s + (e.treasuryUsd ?? 0), 0))}
              sub={`across ${entries.filter((e) => e.treasuryUsd !== null).length} attributed agents`}
            />
            <MetricCard
              label="Daily Burn"
              value={fmtUsd(entries.reduce((s, e) => s + (e.burnRateUsd ?? 0), 0))}
              sub="combined 30d avg"
            />
            <MetricCard
              label="Daily Revenue"
              value={fmtUsd(entries.reduce((s, e) => s + ((e.revenueUsd ?? 0) / 30), 0))}
              sub="combined 30d avg"
            />
            <MetricCard
              label="Critical Agents"
              value={entries.filter((e) => e.status === "critical").length}
              sub="runway < 14 days"
              valueColor={entries.filter((e) => e.status === "critical").length > 0 ? "var(--negative)" : undefined}
            />
          </MetricGrid>

          {/* Per-agent ledger */}
          <LedgerCard eyebrow="Agents" title="Treasury by Agent">
            {entries.map((e, i) => (
              <LedgerRow
                key={e.slug}
                first={i === 0}
                last={i === entries.length - 1}
                label={e.agent.name}
                badge={
                  <StatusBadge variant={statusVariant(e.status)}>
                    {e.loading ? "…" : e.status}
                  </StatusBadge>
                }
                detail={
                  e.loading ? "…" : [
                    `Treasury: ${fmtUsd(e.treasuryUsd)}`,
                    `Burn: ${fmtUsd(e.burnRateUsd)}/day`,
                    `Rev: ${fmtUsd(e.revenueUsd !== null ? e.revenueUsd / 30 : null)}/day`,
                  ].join(" · ")
                }
                value={
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem",
                      color: e.loading ? "var(--muted)"
                        : e.netDaily !== null ? (e.netDaily >= 0 ? "var(--accent)" : "var(--negative)")
                        : "var(--muted)",
                    }}>
                      {e.loading ? "…"
                        : e.netDaily !== null
                          ? (e.netDaily >= 0 ? "+" : "") + fmtUsd(e.netDaily) + "/day"
                          : "—"}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--ink)" }}>
                      {e.loading ? "…" : runwayLabel(e.runwayDays, e.netDaily)}
                    </span>
                    <Link href={`/registry/${e.slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Profile →</Link>
                  </div>
                }
              />
            ))}
          </LedgerCard>

          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: 12 }}>
            Runway = treasury ÷ daily burn (30d avg). Profitable agents show ∞. Requires attributed wallets.
          </p>
        </>
      )}
    </div>
  );
}
