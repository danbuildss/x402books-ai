"use client";

// Operator transactions view — classified activity from the agent's books.
// Honest by construction: everything shown is derived from attributed books
// (revenue by source, expenses by category, quarantined inflows). No wallet
// movement, no invented rows — Zetta reads wallets, it never moves money.

import { useEffect, useState } from "react";
import Link from "next/link";
import { LedgerCard, LedgerRow } from "@/components/ui/ledger";

type BooksLite = {
  attributed: boolean;
  financials?: { revenue_usd: number; expenses_usd: number; net_income_usd: number; tx_count: number };
  classification?: {
    quarantined_inflows_usd: number;
    quarantined_events: { txHash: string; amount_usd: number; reason: string; counterparty: string; timestamp: string }[];
  };
  breakdown?: {
    revenue_by_source: { address: string; total_usd: number; tx_count: number }[];
    expenses_by_category: { category: string; label: string; total_usd: number; tx_count: number }[];
  };
  confidence?: { overall: string; flags: string[] };
  generated_at?: string;
};

type Agent = { name: string; wallets: { address: string }[] };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmtUsd(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

const CHIP: Record<string, string> = {
  settlement: "#4AE8A0",
  expense: "#F46060",
  quarantined: "#F4B942",
};

function Chip({ kind, label }: { kind: keyof typeof CHIP; label: string }) {
  const c = CHIP[kind];
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 700, padding: "1px 8px", borderRadius: 4,
      background: `color-mix(in srgb, ${c} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
      color: c, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

export default function TransactionsPage() {
  const [slug, setSlug] = useState("");
  const [books, setBooks] = useState<BooksLite | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

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
        if (linked) {
          const matched = agentsData.agents.find((a) =>
            a.wallets?.some((w) => w.address.toLowerCase() === linked),
          );
          if (matched) setSlug(toSlug(matched.name));
        }
      } catch { /* unavailable */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setBooks(null);
    fetch(`/api/registry/agents/${slug}/books?period=${period}`)
      .then((r) => r.json())
      .then((d: { books?: BooksLite } & BooksLite) => { if (alive) setBooks((d.books ?? d) as BooksLite); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug, period]);

  const attributed = books?.attributed ? books : null;
  const f = attributed?.financials;

  return (
    <div className="op-page">
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">Transactions</h1>
          <p className="op-page-sub">Classified activity from your agent&apos;s attributed books.</p>
        </div>
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
      </div>

      {loading && <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Loading…</div>}

      {!loading && !slug && (
        <div className="op-alert op-alert-info">
          <span style={{ fontSize: "1rem" }}>ℹ</span>
          <div>
            No agent linked to your wallet.{" "}
            <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>Link your wallet →</Link>
          </div>
        </div>
      )}

      {slug && books && !books.attributed && (
        <div className="op-alert op-alert-info">
          <span style={{ fontSize: "1rem" }}>ℹ</span>
          <div>
            <strong>No attributed books for {slug}.</strong> Classified activity appears once wallets are declared via manifest.{" "}
            <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit manifest →</Link>
          </div>
        </div>
      )}

      {slug && f && (
        <>
          {/* Summary tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 6 }}>
            {([
              { label: "Transactions", v: String(f.tx_count), color: "var(--ink)" },
              { label: "Inflow (operating)", v: f.tx_count > 0 ? `+${fmtUsd(f.revenue_usd)}` : "—", color: "#4AE8A0" },
              { label: "Outflow", v: f.tx_count > 0 ? `−${fmtUsd(f.expenses_usd)}` : "—", color: "#F46060" },
              { label: "Net", v: f.tx_count > 0 ? `${f.net_income_usd >= 0 ? "+" : "−"}${fmtUsd(f.net_income_usd)}` : "—", color: f.net_income_usd >= 0 ? "#4AE8A0" : "#F46060" },
            ]).map((t) => (
              <div key={t.label} style={{ padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: f.tx_count > 0 ? t.color : "var(--muted)" }}>{t.v}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "0.66rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {slug} · {period} window
            {attributed?.generated_at ? ` · as of ${new Date(attributed?.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
            {attributed?.confidence?.flags.includes("tx_window_truncated") ? " · TRUNCATED — totals may be incomplete" : ""}
          </p>

          {/* Revenue by source */}
          {(attributed?.breakdown?.revenue_by_source?.length ?? 0) > 0 && (
            <LedgerCard eyebrow="Inflows" title="Operating revenue by source">
              {attributed?.breakdown!.revenue_by_source.map((r, i, arr) => (
                <LedgerRow
                  key={r.address}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={<span style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>{truncAddr(r.address)}</span>}
                  badge={<Chip kind="settlement" label="revenue" />}
                  detail={`${r.tx_count} tx${r.tx_count === 1 ? "" : "s"}`}
                  value={<span style={{ fontFamily: "var(--font-mono)", color: "#4AE8A0" }}>+{fmtUsd(r.total_usd)}</span>}
                />
              ))}
            </LedgerCard>
          )}

          {/* Expenses by category */}
          {(attributed?.breakdown?.expenses_by_category?.length ?? 0) > 0 && (
            <LedgerCard eyebrow="Outflows" title="Expenses by category">
              {attributed?.breakdown!.expenses_by_category.map((e, i, arr) => (
                <LedgerRow
                  key={e.category}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={e.label}
                  badge={<Chip kind="expense" label={e.category === "unknown" ? "unknown" : "expense"} />}
                  detail={`${e.tx_count} tx${e.tx_count === 1 ? "" : "s"}`}
                  value={<span style={{ fontFamily: "var(--font-mono)", color: "#F46060" }}>−{fmtUsd(e.total_usd)}</span>}
                />
              ))}
            </LedgerCard>
          )}

          {/* Quarantined */}
          {(attributed?.classification?.quarantined_events?.length ?? 0) > 0 && (
            <LedgerCard
              eyebrow="Held out of revenue"
              title={`Quarantined inflows · ${fmtUsd(attributed?.classification!.quarantined_inflows_usd)}`}
              action={<Link href={`/dashboard/luca?agent=${slug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem" }}>Ask Luca why →</Link>}
            >
              {attributed?.classification!.quarantined_events.map((q, i, arr) => (
                <LedgerRow
                  key={`${q.txHash}-${i}`}
                  first={i === 0}
                  last={i === arr.length - 1}
                  label={
                    <a
                      href={`https://basescan.org/tx/${q.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink)" }}
                    >
                      {q.txHash.slice(0, 10)}…
                    </a>
                  }
                  badge={<Chip kind="quarantined" label={q.reason.replace(/_/g, " ")} />}
                  detail={new Date(q.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  value={<span style={{ fontFamily: "var(--font-mono)", color: "#F4B942" }}>{fmtUsd(q.amount_usd)}</span>}
                />
              ))}
            </LedgerCard>
          )}

          <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Quarantined and unknown amounts are never counted as operating revenue.
            Zetta reads wallet activity — it never initiates transfers.
          </p>
        </>
      )}
    </div>
  );
}
