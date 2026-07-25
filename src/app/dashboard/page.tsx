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

function fmtUsdCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return "$" + (Math.abs(n) / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (Math.abs(n) / 1_000).toFixed(1) + "K";
  return fmtUsd(n);
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

// SVG cash-flow bar chart showing revenue vs expenses for the period
function CashFlowChart({ revenue, expenses }: { revenue: number; expenses: number }) {
  const W = 100;
  const H = 48;
  const maxVal = Math.max(revenue, expenses, 1);
  const revH = Math.round((revenue / maxVal) * (H - 8));
  const expH = Math.round((expenses / maxVal) * (H - 8));
  const barW = 14;
  const gap = 8;
  const startX = (W - (barW * 2 + gap)) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      {/* Baseline */}
      <line x1={0} y1={H - 4} x2={W} y2={H - 4} stroke="var(--line)" strokeWidth={0.5} />
      {/* Revenue bar */}
      <rect
        x={startX}
        y={H - 4 - revH}
        width={barW}
        height={revH}
        fill="#4AE8A0"
        fillOpacity={0.85}
        rx={2}
      />
      {/* Expenses bar */}
      <rect
        x={startX + barW + gap}
        y={H - 4 - expH}
        width={barW}
        height={expH}
        fill="#F46060"
        fillOpacity={0.7}
        rx={2}
      />
    </svg>
  );
}

export default function OverviewPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [anomalyMap, setAnomalyMap] = useState<Record<string, Anomaly[]>>({});
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BooksLite | null>(null);
  const [booksSlug, setBooksSlug] = useState<string>("");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

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

  const fin = books?.attributed ? books.financials : null;
  const hasActivity = (fin?.tx_count ?? 0) > 0;
  const expenseCategories = books?.breakdown?.expenses_by_category ?? [];
  const totalExpenses = expenseCategories.reduce((s, c) => s + c.total_usd, 0);

  return (
    <div className="op-page">
      {/* ── Header ── */}
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
                    transition: "color 0.15s, background 0.15s",
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

      {/* ── Financial hero (attributed books only) ── */}
      {booksSlug && books?.attributed && fin && (
        <>
          {/* 4-tile row: treasury hero + 3 stats */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.3fr) repeat(3, 1fr)", gap: 12, marginBottom: 6 }}>
            {/* Treasury — accent left border + large mono */}
            <div style={{
              padding: "20px 20px",
              border: "1px solid var(--line)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "var(--radius-card)",
              background: "var(--surface)",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Treasury</p>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)", lineHeight: 1.1 }}>
                {fin.treasury_balance_usd != null ? fmtUsd(fin.treasury_balance_usd) : "—"}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "0.66rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                {books.wallets?.analyzed ?? 0} wallet{(books.wallets?.analyzed ?? 0) === 1 ? "" : "s"} · stables only
              </p>
            </div>

            {/* Revenue */}
            <div style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Revenue · {period}</p>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: hasActivity ? "var(--accent)" : "var(--muted)" }}>
                {hasActivity ? fmtUsd(fin.revenue_usd) : "—"}
              </p>
              {hasActivity && (
                <div style={{ marginTop: 10 }}>
                  <CashFlowChart revenue={fin.revenue_usd} expenses={0} />
                </div>
              )}
            </div>

            {/* Expenses */}
            <div style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Expenses · {period}</p>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: hasActivity ? "var(--negative)" : "var(--muted)" }}>
                {hasActivity ? `−${fmtUsd(fin.expenses_usd)}` : "—"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                conf: {books.confidence?.overall ?? "n/a"}
                {books.confidence?.flags.includes("tx_window_truncated") ? " · truncated" : ""}
              </p>
            </div>

            {/* Net */}
            <div style={{ padding: "16px 18px", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", background: "var(--surface)" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Net · {period}</p>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: hasActivity ? (fin.net_income_usd >= 0 ? "var(--accent)" : "var(--negative)") : "var(--muted)" }}>
                {hasActivity ? `${fin.net_income_usd >= 0 ? "+" : "−"}${fmtUsd(fin.net_income_usd)}` : "—"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                {fin.tx_count} tx in window
              </p>
            </div>
          </div>

          {/* Timestamp row */}
          <p style={{ margin: "0 0 20px", fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {booksSlug} · {period} window
            {books.generated_at ? ` · as of ${new Date(books.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>

          {/* ── Two-column: expense breakdown + quarantined ── */}
          {(expenseCategories.length > 0 || (books.classification?.quarantined_events?.length ?? 0) > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: expenseCategories.length > 0 && (books.classification?.quarantined_events?.length ?? 0) > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 20 }}>

              {/* Expense breakdown */}
              {expenseCategories.length > 0 && (
                <LedgerCard eyebrow="Period breakdown" title="Expenses by category">
                  {expenseCategories.slice(0, 5).map((cat, i, arr) => {
                    const pct = totalExpenses > 0 ? Math.round((cat.total_usd / totalExpenses) * 100) : 0;
                    return (
                      <LedgerRow
                        key={cat.category}
                        first={i === 0}
                        last={i === arr.length - 1}
                        label={
                          <div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>{cat.label}</div>
                            {/* Mini bar */}
                            <div style={{ height: 3, width: "100%", background: "var(--line)", borderRadius: 2, maxWidth: 140 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: "var(--negative)", borderRadius: 2, opacity: 0.8 }} />
                            </div>
                          </div>
                        }
                        detail={`${cat.tx_count} tx`}
                        value={
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--negative)" }}>{fmtUsdCompact(cat.total_usd)}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.64rem", color: "var(--muted)" }}>{pct}%</div>
                          </div>
                        }
                        style={{ alignItems: "flex-start", paddingTop: 12, paddingBottom: 12 }}
                      />
                    );
                  })}
                </LedgerCard>
              )}

              {/* Quarantined inflows */}
              {(books.classification?.quarantined_events?.length ?? 0) > 0 && (
                <LedgerCard
                  eyebrow="Needs attention"
                  title={`Quarantined inflows · ${fmtUsd(books.classification!.quarantined_inflows_usd)}`}
                  action={
                    <Link href={`/dashboard/luca?agent=${booksSlug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem" }}>Ask Luca →</Link>
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
                          <span style={{ color: "var(--warning)" }}>{q.reason.replace(/_/g, " ")}</span>
                        </span>
                      }
                      detail={new Date(q.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      value={<span style={{ fontFamily: "var(--font-mono)", color: "var(--warning)" }}>{fmtUsd(q.amount_usd)}</span>}
                    />
                  ))}
                </LedgerCard>
              )}
            </div>
          )}

          {/* Single quarantined card (no expense breakdown) */}
          {expenseCategories.length === 0 && (books.classification?.quarantined_events?.length ?? 0) > 0 && (
            <LedgerCard
              eyebrow="Needs attention"
              title={`Quarantined inflows · ${fmtUsd(books.classification!.quarantined_inflows_usd)}`}
              action={
                <Link href={`/dashboard/luca?agent=${booksSlug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem" }}>Ask Luca →</Link>
              }
              style={{ marginBottom: 20 }}
            >
              {books.classification!.quarantined_events.slice(0, 5).map((q, i, arr) => (
                <LedgerRow
                  key={`${q.txHash}-${i}`}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                      {q.txHash.slice(0, 10)}…{" "}
                      <span style={{ color: "var(--warning)" }}>{q.reason.replace(/_/g, " ")}</span>
                    </span>
                  }
                  detail={new Date(q.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  value={<span style={{ fontFamily: "var(--font-mono)", color: "var(--warning)" }}>{fmtUsd(q.amount_usd)}</span>}
                />
              ))}
            </LedgerCard>
          )}
        </>
      )}

      {/* Books unattributed */}
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

      {/* Attention alerts */}
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
            No agents linked to your wallet yet.{" "}
            <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit or claim your agent →</Link>
          </div>
        </div>
      )}

      {totalAnomalies > 0 && (
        <div className="op-alert" style={{
          background: "color-mix(in srgb, #F4B942 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, #F4B942 30%, transparent)",
          borderLeft: "3px solid #F4B942",
          color: "var(--ink)",
        }}>
          <span style={{ fontSize: "1rem", color: "var(--warning)" }}>⚠</span>
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

      {/* ── Metric tiles (3-col, no Quick Links) ── */}
      <MetricGrid cols={3}>
        <MetricCard
          label="My Agents"
          value={myAgents.length}
          sub={wallet ? "linked to your wallet" : "wallet not linked"}
        />
        <MetricCard
          label="Attribution"
          value={myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length}
          sub={`of ${myAgents.length} agent${myAgents.length === 1 ? "" : "s"} verified`}
          trend={myAgents.filter((a) => a.verificationStatus === "Verified" || a.verificationStatus === "Luca Managed").length > 0 ? "verified" : undefined}
          trendPositive
        />
        <MetricCard
          label="Active Signals"
          value={totalAnomalies}
          sub={totalAnomalies > 0 ? "require attention" : "all clear"}
          valueColor={totalAnomalies > 0 ? "var(--warning)" : undefined}
        />
      </MetricGrid>

      {/* ── My Agents summary ── */}
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
            return (
              <LedgerRow
                key={agent.name}
                first={i === 0}
                last={i === Math.min(myAgents.length, 5) - 1}
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

      {/* ── Onboarding (no agents yet) ── */}
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
