"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

type Agent = { name: string; slug?: string; wallets: { address: string }[] };

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmtUsd(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px",
      borderRadius: "var(--radius-sm)",
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      color, whiteSpace: "nowrap",
      textTransform: "uppercase" as const, letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}

export default function TransactionsPage() {
  const [slug, setSlug]   = useState("");
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
            a.wallets?.some((w) => w.address.toLowerCase() === linked)
          );
          if (matched) setSlug(matched.slug ?? toSlug(matched.name));
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
  const conf = attributed?.confidence?.overall;

  return (
    <div className="op-page">
      {/* ── Header ── */}
      <div className="op-page-header-row">
        <div>
          <h1 className="op-page-title">Transactions</h1>
          <p className="op-page-sub">Classified activity from your agent&apos;s attributed books.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {conf && (
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              conf:{" "}
              <span style={{ color: conf === "high" ? "var(--accent)" : conf === "medium" ? "var(--warning)" : "var(--negative)" }}>
                {conf}
              </span>
            </span>
          )}
          {/* Period toggle */}
          <div style={{ display: "flex", gap: 2, border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: 2 }}>
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: "4px 12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                  fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                  background: period === p ? "var(--surface-soft)" : "transparent",
                  color: period === p ? "var(--accent)" : "var(--muted)",
                  transition: "background 0.12s, color 0.12s",
                }}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "32px 0" }}>Loading…</div>
      )}

      {!loading && !slug && (
        <div className="op-alert op-alert-info">
          <span>ℹ</span>
          <div>
            No agent linked to your wallet.{" "}
            <Link href="/dashboard/settings" style={{ color: "var(--accent)" }}>Link your wallet →</Link>
          </div>
        </div>
      )}

      {slug && books && !books.attributed && (
        <div className="op-alert op-alert-info">
          <span>ℹ</span>
          <div>
            <strong>No attributed books for {slug}.</strong>{" "}
            Classified activity appears once wallets are declared via manifest.{" "}
            <Link href="/dashboard/attribution" style={{ color: "var(--accent)" }}>Submit manifest →</Link>
          </div>
        </div>
      )}

      {slug && f && (
        <>
          {/* ── Stat strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(3, 1fr)", gap: 10, marginBottom: 6 }}>
            {[
              { label: "Transactions", value: String(f.tx_count), sub: `in ${period} window`, accent: true },
              { label: "Inflow", value: f.tx_count > 0 ? `+${fmtUsd(f.revenue_usd)}` : "—", sub: "operating revenue", color: f.tx_count > 0 ? "var(--accent)" : undefined },
              { label: "Outflow", value: f.tx_count > 0 ? `−${fmtUsd(f.expenses_usd)}` : "—", sub: "classified expenses", color: f.tx_count > 0 ? "var(--negative)" : undefined },
              {
                label: "Net",
                value: f.tx_count > 0 ? `${f.net_income_usd >= 0 ? "+" : "−"}${fmtUsd(f.net_income_usd)}` : "—",
                sub: `${period} net income`,
                color: f.tx_count > 0 ? (f.net_income_usd >= 0 ? "var(--accent)" : "var(--negative)") : undefined,
              },
            ].map((t) => (
              <div key={t.label} style={{
                padding: "16px 18px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderLeft: t.accent ? "3px solid var(--accent)" : undefined,
                borderRadius: "var(--radius-card)",
              }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>{t.label}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: t.color ?? "var(--ink)" }}>{t.value}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{t.sub}</div>
              </div>
            ))}
          </div>

          {/* Timestamp */}
          <div style={{ fontSize: "0.64rem", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
            {slug} · {period} window
            {attributed?.generated_at
              ? ` · as of ${new Date(attributed.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : ""}
            {attributed?.confidence?.flags.includes("tx_window_truncated") ? " · TRUNCATED — totals may be incomplete" : ""}
          </div>

          {/* ── Inflows ── */}
          {(attributed?.breakdown?.revenue_by_source?.length ?? 0) > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", marginBottom: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Inflows</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Operating revenue by source</div>
              </div>
              {attributed!.breakdown!.revenue_by_source.map((r, i, arr) => (
                <div
                  key={r.address}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-soft)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink)" }}>{truncAddr(r.address)}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{r.tx_count} tx{r.tx_count === 1 ? "" : "s"}</div>
                  </div>
                  <Chip color="var(--accent)" label="revenue" />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--accent)", whiteSpace: "nowrap" }}>+{fmtUsd(r.total_usd)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Outflows ── */}
          {(attributed?.breakdown?.expenses_by_category?.length ?? 0) > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", marginBottom: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Outflows</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>Expenses by category</div>
              </div>
              {attributed!.breakdown!.expenses_by_category.map((e, i, arr) => (
                <div
                  key={e.category}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(ev) => { (ev.currentTarget as HTMLDivElement).style.background = "var(--surface-soft)"; }}
                  onMouseLeave={(ev) => { (ev.currentTarget as HTMLDivElement).style.background = ""; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--ink)" }}>{e.label}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{e.tx_count} tx{e.tx_count === 1 ? "" : "s"}</div>
                  </div>
                  <Chip color="var(--negative)" label={e.category === "unknown" ? "unknown" : "expense"} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--negative)", whiteSpace: "nowrap" }}>−{fmtUsd(e.total_usd)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Quarantined ── */}
          {(attributed?.classification?.quarantined_events?.length ?? 0) > 0 && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderLeft: "3px solid #F4B942",
              borderRadius: "var(--radius-card)",
              marginBottom: 12,
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>Held out of revenue</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>
                    Quarantined inflows · {fmtUsd(attributed!.classification!.quarantined_inflows_usd)}
                  </div>
                </div>
                <Link href={`/dashboard/luca?agent=${slug}`} className="op-btn op-btn-ghost" style={{ fontSize: "0.72rem" }}>Ask Luca why →</Link>
              </div>
              {attributed!.classification!.quarantined_events.map((q, i, arr) => (
                <div
                  key={`${q.txHash}-${i}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-soft)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={`https://basescan.org/tx/${q.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.74rem", color: "var(--ink)", textDecoration: "none" }}
                    >
                      {q.txHash.slice(0, 10)}…
                    </a>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      {new Date(q.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <Chip color="var(--warning)" label={q.reason.replace(/_/g, " ")} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--warning)", whiteSpace: "nowrap" }}>{fmtUsd(q.amount_usd)}</span>
                </div>
              ))}
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: "0.69rem", color: "var(--muted)", lineHeight: 1.6 }}>
                Quarantined and unknown amounts are never counted as operating revenue. Zetta reads wallet activity — it never initiates transfers.
              </div>
            </div>
          )}

          {/* Global footnote when no quarantine card */}
          {(attributed?.classification?.quarantined_events?.length ?? 0) === 0 && (
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.6 }}>
              Quarantined and unknown amounts are never counted as operating revenue.
              Zetta reads wallet activity — it never initiates transfers.
            </p>
          )}
        </>
      )}
    </div>
  );
}
