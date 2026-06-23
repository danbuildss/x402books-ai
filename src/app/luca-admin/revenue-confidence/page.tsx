"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AgentConfidenceLabel, ConfidenceLevel } from "@/lib/revenue-confidence";
import { CONFIDENCE_META } from "@/lib/revenue-confidence";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentRow = {
  slug:  string;
  name:  string;
  label: AgentConfidenceLabel | null;
};

// Priority agents always shown even without a label
const PRIORITY_AGENTS: { slug: string; name: string }[] = [
  { slug: "luca",              name: "AEON / Luca"       },
  { slug: "bankr",             name: "Bankr"             },
  { slug: "virtuals-protocol", name: "Virtuals Protocol" },
  { slug: "clanker",           name: "Clanker"           },
  { slug: "autonolas",         name: "Autonolas"         },
  { slug: "nookplot",          name: "Nookplot"          },
  { slug: "venice",            name: "Venice"            },
  { slug: "aixbt",             name: "aixbt"             },
  { slug: "ethy",              name: "Ethy"              },
  { slug: "coinbase-agentkit", name: "Coinbase AgentKit" },
];

const LEVELS: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: "high",         label: "High Confidence",        color: "#22c55e" },
  { value: "medium",       label: "Medium Confidence",      color: "#f59e0b" },
  { value: "low",          label: "Low Confidence",         color: "#ef4444" },
  { value: "under_review", label: "Attribution Under Review", color: "#6b7280" },
];

// ── Label Card ────────────────────────────────────────────────────────────────

function AgentLabelCard({ row, secret, onSaved }: { row: AgentRow; secret: string; onSaved: () => void }) {
  const [level,       setLevel]       = useState<ConfidenceLevel | "">(row.label?.confidence_level ?? "");
  const [publicNote,  setPublicNote]  = useState(row.label?.public_note ?? "");
  const [internalNote,setInternalNote]= useState(row.label?.internal_reason ?? "");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  async function save() {
    if (!level) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/admin/confidence-label", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify({
          slug: row.slug, level,
          public_note:      publicNote || undefined,
          internal_reason:  internalNote || undefined,
          reviewed_by:      "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError((json as { error?: string }).error ?? `HTTP ${res.status}`); return; }
      setSaved(true);
      onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const meta = level ? CONFIDENCE_META[level] : null;
  const currentMeta = row.label ? CONFIDENCE_META[row.label.confidence_level] : null;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/registry/${row.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>
          {row.name}
        </Link>
        {currentMeta && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${currentMeta.color}22`, color: currentMeta.color }}>
            {currentMeta.label}
          </span>
        )}
        {!row.label && (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>not yet labeled</span>
        )}
        <Link href={`/luca-admin/revenue-audit`} style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
          Run audit →
        </Link>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Level picker */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: "1px solid",
                borderColor: level === l.value ? l.color : "var(--line)",
                background: level === l.value ? `${l.color}18` : "transparent",
                color: level === l.value ? l.color : "var(--muted)",
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Public note */}
        <div>
          <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
            PUBLIC NOTE (shown on profile)
          </label>
          <textarea
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="e.g. Revenue attribution verified against on-chain evidence. Stablecoin-only Base activity."
            rows={2}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        {/* Internal note */}
        <div>
          <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
            INTERNAL REASON (admin only)
          </label>
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="e.g. AEON disputes $3.4M figure. Cross-chain activity not captured. Awaiting wallet manifest update."
            rows={2}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: "#ef4444" }}>{error}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={save}
            disabled={saving || !level}
            style={{
              padding: "7px 18px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600,
              background: saving || !level ? "var(--line)" : (meta?.color ?? "var(--accent)"),
              color: saving || !level ? "var(--muted)" : "#fff",
              cursor: saving || !level ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Label"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "#22c55e" }}>Saved</span>}
          {row.label?.reviewed_at && (
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
              Last reviewed {new Date(row.label.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RevenueConfidencePage() {
  const [secret,  setSecret]  = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("luca_admin_secret") ?? "" : ""
  );
  useEffect(() => {
    if (secret) sessionStorage.setItem("luca_admin_secret", secret);
  }, [secret]);
  const [rows,    setRows]    = useState<AgentRow[]>(PRIORITY_AGENTS.map((a) => ({ ...a, label: null })));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const loadLabels = useCallback(async (s: string) => {
    if (!s) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/confidence-label", { headers: { "x-internal-secret": s } });
      const json = await res.json() as { labels?: AgentConfidenceLabel[]; error?: string };
      if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); return; }
      const labels = json.labels ?? [];
      setRows(PRIORITY_AGENTS.map((a) => ({
        ...a,
        label: labels.find((l) => l.agent_slug === a.slug) ?? null,
      })));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  const stats = {
    high:         rows.filter((r) => r.label?.confidence_level === "high").length,
    medium:       rows.filter((r) => r.label?.confidence_level === "medium").length,
    low:          rows.filter((r) => r.label?.confidence_level === "low").length,
    under_review: rows.filter((r) => r.label?.confidence_level === "under_review").length,
    unlabeled:    rows.filter((r) => !r.label).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/luca-admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Admin</Link>
        <span style={{ color: "var(--line)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Revenue Confidence Labels</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          Labels appear publicly on agent profiles
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>

        {/* Auth + load */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>INTERNAL SECRET</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="X402BOOKS_INTERNAL_SECRET"
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, width: 220 }}
            />
          </div>
          <button
            onClick={() => loadLabels(secret)}
            disabled={loading || !secret}
            style={{
              padding: "8px 18px", borderRadius: 6, border: "none",
              background: loading || !secret ? "var(--line)" : "var(--accent)",
              color: loading || !secret ? "var(--muted)" : "#fff",
              fontWeight: 600, fontSize: 13, cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Loading…" : "Load Labels"}
          </button>
          <Link href="/registry/confidence" target="_blank" style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", textDecoration: "none", alignSelf: "center" }}>
            Public report →
          </Link>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>{error}</div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "High",          value: stats.high,         color: "#22c55e" },
            { label: "Medium",        value: stats.medium,       color: "#f59e0b" },
            { label: "Low",           value: stats.low,          color: "#ef4444" },
            { label: "Under Review",  value: stats.under_review, color: "#6b7280" },
            { label: "Not Labeled",   value: stats.unlabeled,    color: "var(--muted)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", minWidth: 90 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Guidance */}
        <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink)" }}>Workflow:</strong> Run the{" "}
          <Link href="/luca-admin/revenue-accuracy-report" style={{ color: "var(--accent)", textDecoration: "none" }}>Revenue Accuracy Report</Link>{" "}
          first to get transaction evidence. Then for each flagged agent, open{" "}
          <Link href="/luca-admin/revenue-audit" style={{ color: "var(--accent)", textDecoration: "none" }}>Revenue Audit Mode</Link>{" "}
          to review individual transactions. Then set the label here. Labels appear on public agent profiles immediately.
          Set AEON and Virtuals to <strong style={{ color: "#6b7280" }}>Attribution Under Review</strong> until the audit is complete.
        </div>

        {/* Agent cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((row) => (
            <AgentLabelCard
              key={row.slug}
              row={row}
              secret={secret}
              onSaved={() => loadLabels(secret)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
