"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AttributionMetrics, AgentAttributionHealth, ManifestStatus, AttributionConfidence } from "@/lib/attribution-health";

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ManifestStatus, { label: string; color: string }> = {
  manifest: { label: "Manifest",     color: "#22c55e" },
  admin:    { label: "Admin",        color: "#6DB874" },
  inferred: { label: "Inferred",     color: "#f59e0b" },
  none:     { label: "Unattributed", color: "#6b7280" },
};

const CONF_META: Record<AttributionConfidence, { label: string; color: string }> = {
  high:         { label: "High",         color: "#22c55e" },
  medium:       { label: "Medium",       color: "#f59e0b" },
  low:          { label: "Low",          color: "#ef4444" },
  unattributed: { label: "–",            color: "#6b7280" },
};

type SortKey = "name" | "status" | "wallets" | "roles" | "confidence";

function sortAgents(agents: AgentAttributionHealth[], key: SortKey, dir: 1 | -1) {
  const STATUS_RANK: Record<ManifestStatus, number> = { manifest: 0, admin: 1, inferred: 2, none: 3 };
  const CONF_RANK: Record<AttributionConfidence, number> = { high: 0, medium: 1, low: 2, unattributed: 3 };
  return [...agents].sort((a, b) => {
    let cmp = 0;
    if (key === "name")       cmp = a.name.localeCompare(b.name);
    if (key === "status")     cmp = STATUS_RANK[a.manifest_status] - STATUS_RANK[b.manifest_status];
    if (key === "wallets")    cmp = b.wallet_count - a.wallet_count;
    if (key === "roles")      cmp = b.role_coverage_pct - a.role_coverage_pct;
    if (key === "confidence") cmp = CONF_RANK[a.confidence] - CONF_RANK[b.confidence];
    return cmp * dir;
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttributionHealthAdminPage() {
  const [metrics, setMetrics] = useState<AttributionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [filter, setFilter]   = useState<ManifestStatus | "all">("all");
  const [sort, setSort]       = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/v1/attribution-health")
      .then((r) => r.json())
      .then((json: AttributionMetrics & { ok: boolean; error?: string }) => {
        if (!json.ok) { setError(json.error ?? "Failed to load"); return; }
        setMetrics(json);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSort(key); setSortDir(1); }
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: sort === k ? 700 : 400, color: sort === k ? "var(--ink)" : "var(--muted)", fontSize: 11, padding: "0 4px", display: "flex", alignItems: "center", gap: 2 }}
    >
      {label} {sort === k && (sortDir === 1 ? "↑" : "↓")}
    </button>
  );

  const visible = metrics
    ? sortAgents(
        metrics.agents.filter((a) => {
          if (filter !== "all" && a.manifest_status !== filter) return false;
          if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }),
        sort,
        sortDir,
      )
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Attribution Health</span>
        <Link href="/registry/attribution" target="_blank" style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          Public report →
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>

        {loading && <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading attribution metrics…</div>}
        {error   && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}

        {metrics && (
          <>
            {/* KPI cards */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { label: "Indexed",           value: metrics.total_agents,               color: "var(--ink)" },
                { label: "Attributed",         value: metrics.attributed_agents,          color: "var(--ink)" },
                { label: "Coverage",           value: `${metrics.attribution_coverage_pct}%`, color: "#6DB874" },
                { label: "Manifest",           value: metrics.manifest_agents,            color: "#22c55e" },
                { label: "Manifest %",         value: `${metrics.manifest_coverage_pct}%`,    color: "#22c55e" },
                { label: "Wallets",            value: metrics.total_wallets,              color: "var(--ink)" },
                { label: "Role coverage",      value: `${metrics.role_coverage_pct}%`,       color: "#f59e0b" },
              ].map((kpi) => (
                <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", minWidth: 100 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ height: 6, borderRadius: 3, overflow: "hidden", background: "var(--line)", display: "flex", marginBottom: 12 }}>
                {([
                  { status: "manifest" as ManifestStatus, count: metrics.status_breakdown.manifest, opacity: 1 },
                  { status: "admin"    as ManifestStatus, count: metrics.status_breakdown.admin_attributed, opacity: 0.7 },
                  { status: "inferred" as ManifestStatus, count: metrics.status_breakdown.inferred, opacity: 0.5 },
                ] as const).map(({ status, count, opacity }) => (
                  <div
                    key={status}
                    style={{ width: `${(count / metrics.total_agents) * 100}%`, background: STATUS_META[status].color, opacity }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {(["manifest", "admin_attributed", "inferred", "none"] as const).map((k) => {
                  const statusKey = k === "admin_attributed" ? "admin" : k === "none" ? "none" : k;
                  const count = metrics.status_breakdown[k];
                  const meta  = STATUS_META[statusKey as ManifestStatus];
                  return (
                    <button
                      key={k}
                      onClick={() => setFilter(filter === statusKey ? "all" : statusKey as ManifestStatus)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: filter !== "all" && filter !== statusKey ? 0.5 : 1 }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{meta.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents…"
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 200 }}
              />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{visible.length} agents</span>
            </div>

            {/* Table */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {[
                      { k: "name",       label: "Agent"       },
                      { k: "status",     label: "Status"      },
                      { k: "wallets",    label: "Wallets"     },
                      { k: "roles",      label: "Role cov."   },
                      { k: "confidence", label: "Confidence"  },
                    ].map(({ k, label }) => (
                      <th key={k} style={{ padding: "8px 12px", textAlign: "left" }}>
                        <SortBtn k={k as SortKey} label={label} />
                      </th>
                    ))}
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((agent, i) => {
                    const sMeta = STATUS_META[agent.manifest_status];
                    const cMeta = CONF_META[agent.confidence];
                    return (
                      <tr
                        key={agent.slug}
                        style={{ borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : "none", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <Link href={`/registry/${agent.slug}`} target="_blank" rel="noopener" style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", textDecoration: "none" }}>
                            {agent.name}
                          </Link>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{agent.ecosystem}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${sMeta.color}18`, color: sMeta.color }}>
                            {sMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: agent.wallet_count > 0 ? "var(--ink)" : "var(--muted)" }}>
                          {agent.wallet_count > 0 ? agent.wallet_count : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: agent.role_coverage_pct > 0 ? "var(--ink)" : "var(--muted)" }}>
                          {agent.wallet_count > 0 ? `${agent.role_coverage_pct}%` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${cMeta.color}18`, color: cMeta.color }}>
                            {cMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {agent.has_revenue_wallet && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#22c55e18", color: "#22c55e" }}>rev</span>
                            )}
                            {agent.has_treasury_wallet && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "#5B8FA818", color: "#5B8FA8" }}>treasury</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
