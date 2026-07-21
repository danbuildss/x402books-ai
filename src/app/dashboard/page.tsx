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

// Subset of the AgentBooks JSON the overview binds to (public books route).
type BooksLite = {
  attributed: boolean;
  reason?: string;
  period?: string;
  financials?: {
    revenue_usd: number;
    expenses_usd: number;
    net_income_usd: number;
    treasury_balance_usd: number | null;
    tx_count: number;
  };
  classification?: {
    quarantined_inflows_usd: number;
    quarantined_events: { txHash: string; amount_usd: number; reason: string; counterparty: string; timestamp: string }[];
  };
  confidence?: { overall: string; flags: string[] };
  breakdown?: {
    revenue_by_source: { address: string; total_usd: number; tx_count: number }[];
    expenses_by_category: { category: string; label: string; total_usd: number; tx_count: number }[];
  };
  wallets?: { declared: number; analyzed: number };
  generated_at?: string;
};

function fmtUsd(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

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

export default function OverviewPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [anomalyMap, setAnomalyMap] = useState<Record<string, Anomaly[]>>({});
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BooksLite | null>(null);
  const [booksSlug, setBooksSlug] = useState<string>("");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Books for the operator's first linked agent — public registry books route.
  useEffect(() => {
    if (!booksSlug) return;
    let alive = true;
    setBooks(null);
    fetch(`/api/registry/agents/${booksSlug}/books?period=${period}`)
      .then((r) => r.json())
      .then((d: { books?: BooksLite } & BooksLite) => {
        if (alive) setBooks((d.books ?? d) as BooksLite);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [booksSlug, period]);

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
          if (matched.length > 0) setBooksSlug(toSlug(matched[0].name));

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
      <div className="op-page-header" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 className="op-page-title">
            {greeting()}{myAgents.length > 0 ? `, ${myAgents[0].name}` : ""}
          </h1>
          <p className="op-page-sub">Your agent&apos;s books, treasury, and data quality — in one place.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {booksSlug && (
            <div style={{ display: "flex", gap: 2, border: "1px solid var(--line)", borderRadius: 6, padding: 2 }}>
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                    fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                    background: period === p ? "var(--surface-soft)" : "transparent",
                    color: period === p ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <Link href={`/dashboard/luca${booksSlug ? `?agent=${booksSlug}` : ""}`} className="op-btn" style={{ whiteSpace: "nowrap" }}>
            ✦ Ask Luca
          </Link>
        </div>
      </div>

      {/* ── Financials for the linked agent (books-driven, honest states) ── */}
      {booksSlug && books?.attributed && books.financials && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.2fr) repeat(3, 1fr)", gap: 12, marginBottom: 6 }}>
            {/* Treasury hero */}
            <div style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Treasury (stables)</p>
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                {books.financials.treasury_balance_usd != null ? fmtUsd(books.financials.treasury_balance_usd) : "—"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "0.68rem", color: "var(--muted)" }}>
                across {books.wallets?.analyzed ?? 0} declared wallet{(books.wallets?.analyzed ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
            {/* Stat tiles — zeros only when measured */}
            {([
              { label: `Revenue ${period}`, v: books.financials.revenue_usd, color: "#4AE8A0", sign: "" },
              { label: `Expenses ${period}`, v: books.financials.expenses_usd, color: "#F46060", sign: "−" },
              { label: `Net ${period}`, v: books.financials.net_income_usd, color: books.financials.net_income_usd >= 0 ? "#4AE8A0" : "#F46060", sign: books.financials.net_income_usd >= 0 ? "+" : "−" },
            ] as const).map((t) => (
              <div key={t.label} style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: books.financials!.tx_count > 0 ? t.color : "var(--muted)" }}>
                  {books.financials!.tx_count > 0 ? `${t.sign}${fmtUsd(t.v)}` : "—"}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "0.66rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  confidence: {books.confidence?.overall ?? "n/a"}
                  {books.confidence?.flags.includes("tx_window_truncated") ? " · truncated" : ""}
                </p>
              </div>
            ))}
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "0.66rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {booksSlug} · {period} window{books.generated_at ? ` · as of ${new Date(books.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>

          {/* Needs attention — quarantined inflows awaiting classification */}
          {(books.classification?.quarantined_events?.length ?? 0) > 0 && (
            <LedgerCard
              eyebrow="Needs attention"
              title={`Quarantined inflows · ${fmtUsd(books.classification!.quarantined_inflows_usd)}`}
              action={
                <Link href={`/dashboard/luca?agent=${booksSlug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem" }}>Ask Luca why →</Link>
              }
            >
              {books.classification!.quarantined_events.slice(0, 5).map((q, i, arr) => (
                <LedgerRow
                  key={`${q.txHash}-${i}`}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                      {q.txHash.slice(0, 10)}…{" "}
                      <span style={{ color: "#F4B942" }}>{q.reason.replace(/_/g, " ")}</span>
                    </span>
                  }
                  detail={new Date(q.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  value={<span style={{ fontFamily: "var(--font-mono)", color: "#F4B942" }}>{fmtUsd(q.amount_usd)}</span>}
                />
              ))}
            </LedgerCard>
          )}
        </>
      )}

      {/* Books exist but agent is unattributed — honest state, no numbers */}
      {booksSlug && books && !books.attributed && (
        <div className="op-alert op-alert-info">
          <span style={{ fontSize: "1rem" }}>ℹ</span>
          <div>
            <strong>No attributed books for {booksSlug}.</strong>{" "}
            Financial figures appear once wallets are declared via <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>.agent/wallets.json</code>.{" "}
            <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit manifest →</Link>
          </div>
        </div>
      )}

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
          background: "color-mix(in srgb, #F4B942 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, #F4B942 30%, transparent)",
          borderLeft: "3px solid #F4B942",
          color: "var(--ink)",
        }}>
          <span style={{ fontSize: "1rem", color: "#F4B942" }}>⚠</span>
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
      <MetricGrid cols={4}>
        <MetricCard
          label="My Agents"
          value={myAgents.length}
          sub={wallet ? "linked to your wallet" : "wallet not linked"}
        />
        <MetricCard
          label="Attribution"
          value={myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length}
          sub={`of ${myAgents.length} agents`}
          trend={myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length > 0 ? "verified" : undefined}
          trendPositive
        />
        <MetricCard
          label="Active Signals"
          value={totalAnomalies}
          sub={totalAnomalies > 0 ? "require attention" : "all clear"}
          valueColor={totalAnomalies > 0 ? "#F4B942" : undefined}
        />
        <MetricCard
          label="Quick Links"
          value={
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <Link href="/dashboard/keys" style={{ fontSize: "0.8rem", color: "var(--accent)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>API Keys →</Link>
              <Link href="/dashboard/luca" style={{ fontSize: "0.8rem", color: "var(--accent)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>Ask Luca →</Link>
            </div>
          }
        />
      </MetricGrid>

      {/* My Agents summary */}
      {myAgents.length > 0 && (
        <LedgerCard
          eyebrow="Workspace"
          title="My Agents"
          action={
            <Link href="/dashboard/agents" className="op-btn" style={{ fontSize: "0.75rem", padding: "5px 10px" }}>View all →</Link>
          }
        >
          {myAgents.slice(0, 5).map((agent, i) => {
            const slug = toSlug(agent.name);
            const agentAnomalies = (anomalyMap[slug] ?? []).filter(
              (a) => a.severity === "high" || a.severity === "medium"
            );
            const isFirst = i === 0;
            const isLast = i === Math.min(myAgents.length, 5) - 1;
            return (
              <LedgerRow
                key={agent.name}
                first={isFirst}
                last={isLast}
                label={agent.name}
                badge={<StatusBadge variant={verificationVariant(agent.verificationStatus)}>{agent.verificationStatus}</StatusBadge>}
                detail={agent.ecosystem}
                value={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {agentAnomalies.length > 0 && (
                      <StatusBadge variant="amber">⚠ {agentAnomalies.length}</StatusBadge>
                    )}
                    <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn" style={{ fontSize: "0.72rem", padding: "4px 8px" }}>Ask Luca</Link>
                  </div>
                }
              />
            );
          })}
        </LedgerCard>
      )}

      {/* Getting started */}
      {myAgents.length === 0 && (
        <LedgerCard eyebrow="Onboarding" title="Get started">
          {[
            { step: "01", title: "Link your wallet", desc: "Connect your wallet to identify which registry agents belong to your workspace.", href: "/dashboard/settings", cta: "Go to Settings" },
            { step: "02", title: "Declare your agent", desc: "Submit a wallets.json manifest to attribute on-chain activity to your agent.", href: "/dashboard/attribution", cta: "Open Attribution" },
            { step: "03", title: "Get your API key", desc: "Generate an API key to query your agent's financial data programmatically.", href: "/dashboard/keys", cta: "Open API Keys" },
          ].map((s, i) => (
            <LedgerRow
              key={s.step}
              first={i === 0}
              last={i === 2}
              label={
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Step {s.step}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{s.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>
                </div>
              }
              value={<Link href={s.href} className="op-btn" style={{ fontSize: "0.75rem", padding: "5px 10px", whiteSpace: "nowrap" }}>{s.cta} →</Link>}
              style={{ alignItems: "flex-start", padding: "14px" }}
            />
          ))}
        </LedgerCard>
      )}
    </div>
  );
}
