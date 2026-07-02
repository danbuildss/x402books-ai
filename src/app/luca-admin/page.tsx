"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import styles from "./page.module.css";
import type { AttributionMetrics, AgentAttributionHealth, ManifestStatus, AttributionConfidence } from "@/lib/attribution-health";
import type { AgentRevenueAudit, AuditTx } from "@/lib/agent-books";
import type { AuditFlag } from "@/app/api/admin/revenue-audit/route";
import type { AgentConfidenceLabel, ConfidenceLevel } from "@/lib/revenue-confidence";
import { CONFIDENCE_META } from "@/lib/revenue-confidence";
import type { PendingUpdate } from "@/lib/registry-db";
import type { AddressType } from "@/lib/address-classifier";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "registry" | "attribution" | "economics" | "growth" | "reports" | "comm" | "outreach" | "settings" | "subagent-runs" | "pending-replies" | "truth-engine" | "pending-updates" | "attribution-health" | "address-classification" | "erc8004" | "revenue-audit" | "accuracy-report" | "confidence-labels" | "b20";
type EcoPeriod = "7d" | "30d";

type HealthData = {
  ok: boolean;
  stage: string;
  services: { alchemy: boolean; supabase: boolean; openai: boolean };
};

type DailyMetric = {
  date: string;
  wallet_scans: number;
  reports_generated: number;
  api_calls: number;
  unique_wallets: number;
  luca_interactions: number;
  registry_submissions: number;
  verified_agents: number;
  failed_scans: number;
  endpoint_calls: number;
};

type GrowthPayload = {
  ok: boolean;
  today: DailyMetric | null;
  sevenDay: DailyMetric[];
  topWallets: { wallet: string; count: number }[];
  failedScans: { wallet: string | null; metadata: Record<string, unknown>; created_at: string }[];
  registryEvents: { event_type: string; agent_name: string | null; update_type: string | null; created_at: string }[];
  error?: string;
};

type EconomicsSummary = {
  agentId: string;
  agentName: string | null;
  periodDays: number;
  totalInferenceSpend: number;
  totalInferenceRevenue: number;
  providerSpend: number;
  fallbackProviderSpend: number;
  apiCosts: number;
  walletInflows: number;
  walletOutflows: number;
  netAgentPosition: number;
  topProvider: string | null;
  fallbackUsageCount: number;
  eventCount: number;
  lucaVerdict: string;
};

type EconomicsResponse = {
  period: string;
  periodDays: number;
  summary: EconomicsSummary;
  report: { summary: string; netPositionLabel: string };
};

type SubagentRun = {
  id: string;
  subagent_name: string;
  status: "running" | "success" | "failed" | "timeout";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  summary: string | null;
  error: string | null;
  triggered_by: string | null;
};

type PendingReply = {
  id: string;
  target_user: string | null;
  target_post_url: string | null;
  draft_reply: string;
  risk_level: "low" | "medium" | "high";
  recommendation: string | null;
  status: "pending" | "approved" | "rejected" | "posted";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  posted_at: string | null;
  created_at: string;
};

// ── Static data ───────────────────────────────────────────────────────────────

const LAYERS = [
  {
    label: "L1",
    title: "Content Intelligence",
    purpose: "Research + publishing",
    color: "var(--blue)",
    agents: [
      { name: "Content Strategist", role: "Decides what Luca should say", cadence: "Daily", status: "active" },
      { name: "X Research Agent",   role: "Studies agents, narratives, and public signals", cadence: "Always on", status: "active" },
      { name: "Writer Agent",       role: "Drafts posts, threads, and audit notes", cadence: "5 drafts/day", status: "manual approval" },
      { name: "Repurposing Agent",  role: "Turns one idea into many formats", cadence: "On demand", status: "planned" },
    ],
  },
  {
    label: "L2",
    title: "Financial Operations",
    purpose: "Accounting + controls",
    color: "var(--accent)",
    agents: [
      { name: "Wallet Audit Agent", role: "Runs Zetta wallet audits", cadence: "On demand", status: "active" },
      { name: "Scoring Agent",      role: "Grades activity, treasury health, and risk", cadence: "Per report", status: "active" },
      { name: "Anomaly Agent",      role: "Flags unusual flows and missing context", cadence: "Per audit", status: "active" },
    ],
  },
  {
    label: "L3",
    title: "Registry + Agent Relations",
    purpose: "Growth + verification",
    color: "#a78bfa",
    agents: [
      { name: "Registry Agent",     role: "Tracks agent wallets and confidence labels", cadence: "Weekly", status: "active" },
      { name: "Verification Agent", role: "Prepares wallet verification requests", cadence: "On demand", status: "planned" },
      { name: "Outreach Agent",     role: "Drafts team-safe messages to agent projects", cadence: "On demand", status: "planned" },
    ],
  },
];

const COMMAND_QUEUE = [
  { item: "Daily X drafts",          owner: "Content Strategist", time: "09:00",    state: "scheduled" },
  { item: "Weekly agent research",   owner: "Registry Agent",     time: "Mon 18:00", state: "scheduled" },
  { item: "Agent Financial Registry",owner: "Luca",               time: "Live",      state: "done" },
  { item: "Luca → registry cron",    owner: "Hermes / VPS",       time: "Weekly",    state: "active" },
];

const POLICIES = [
  "Only Dan can publish to X or approve Bankr write actions.",
  "Public users can ask questions, request reports, and audit their own wallets.",
  "$LUCA is the unified ecosystem token powering Luca and Zetta.",
  "Wallets are never called official unless verified by evidence.",
];


const NAV: { section: Section; label: string; group: string }[] = [
  { section: "overview",   label: "Overview",    group: "main" },
  { section: "registry",          label: "Registry",          group: "registry-ops" },
  { section: "pending-updates",   label: "Pending Updates",   group: "registry-ops" },
  { section: "attribution",       label: "Attribution",       group: "registry-ops" },
  { section: "attribution-health",label: "Attribution Health",group: "registry-ops" },
  { section: "address-classification", label: "Address Classification", group: "data-integrity" },
  { section: "erc8004",           label: "ERC-8004 Ingestion",group: "data-integrity" },
  { section: "truth-engine",      label: "Truth Engine",      group: "data-integrity" },
  { section: "economics",         label: "Economics",         group: "financial" },
  { section: "revenue-audit",     label: "Revenue Audit",     group: "financial" },
  { section: "accuracy-report",   label: "Accuracy Report",   group: "financial" },
  { section: "confidence-labels", label: "Confidence Labels", group: "financial" },
  { section: "growth",            label: "Growth OS",         group: "growth" },
  { section: "reports",           label: "Reports",           group: "growth" },
  { section: "b20",               label: "B20 Intelligence",  group: "growth" },
  { section: "comm",              label: "Comm Intel",        group: "intel" },
  { section: "outreach",          label: "Outreach CRM",      group: "intel" },
  { section: "subagent-runs",     label: "Subagent Runs",     group: "intel" },
  { section: "pending-replies",   label: "Pending Replies",   group: "intel" },
  { section: "settings",          label: "Settings",          group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main:            "Overview",
  "registry-ops":  "Registry",
  "data-integrity":"Data Integrity",
  financial:       "Financial",
  growth:          "Growth OS",
  intel:           "Intelligence",
  system:          "System",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: number | null | undefined) {
  return v == null ? "—" : v.toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortAddr(w: string) {
  return w.length > 18 ? `${w.slice(0, 8)}…${w.slice(-6)}` : w;
}

const usd = (n: number) => `$${Math.abs(n).toFixed(2)}`;
const sign = (n: number) => (n >= 0 ? "+" : "-");

// ── Sections ──────────────────────────────────────────────────────────────────

function OverviewSection({ health, today }: { health: HealthData | null; today: DailyMetric | null }) {
  const agentCount = LAYERS.reduce((t, l) => t + l.agents.length, 1);

  const services = [
    { label: "Alchemy",  ok: health?.services.alchemy  ?? null },
    { label: "Supabase", ok: health?.services.supabase ?? null },
    { label: "OpenAI",   ok: health?.services.openai   ?? null },
  ];

  const metrics = [
    { label: "Scans today",  value: today?.wallet_scans      ?? "—" },
    { label: "API calls",    value: today?.api_calls         ?? "—" },
    { label: "Luca chats",   value: today?.luca_interactions ?? "—" },
    { label: "Failed scans", value: today?.failed_scans      ?? "—" },
  ];

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Command Center</p>
        <h1>Overview</h1>
        <p>{agentCount} agents · 3 layers · 1 manager{health ? ` · v${health.stage}` : ""}</p>
      </div>

      <div className={styles.masterCard}>
        <div className={styles.masterIcon}>L</div>
        <div>
          <h2>Luca</h2>
          <p>Manager Agent · AI Accountant · Agent Financial Registry</p>
        </div>
        <div className={styles.liveChip}>
          <div className={styles.liveDot} />
          Live 24/7
        </div>
      </div>

      <div className={styles.metricGrid}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metricCard}>
            <p className={styles.metricLabel}>{m.label}</p>
            <p className={styles.metricValue}>{String(m.value)}</p>
          </div>
        ))}
      </div>

      <div className={styles.healthRow}>
        {services.map((s) => (
          <div key={s.label} className={styles.healthChip} data-ok={s.ok === null ? "unknown" : s.ok ? "true" : "false"}>
            <span />
            {s.label}
          </div>
        ))}
      </div>

      <div className={styles.layerGrid}>
        {LAYERS.map((layer) => (
          <div key={layer.title} className={styles.layerCard}>
            <div className={styles.layerHeader}>
              <div className={styles.layerDot} style={{ background: layer.color }} />
              <span className={styles.layerTitle}>{layer.label} — {layer.title}</span>
              <span className={styles.layerPurpose}>{layer.purpose}</span>
            </div>
            <div className={styles.agentGrid}>
              {layer.agents.map((agent) => (
                <div key={agent.name} className={styles.agentCard}>
                  <p className={styles.agentName}>{agent.name}</p>
                  <p className={styles.agentRole}>{agent.role}</p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span className={styles.agentBadge}>{agent.cadence}</span>
                    <span className={agent.status === "active" ? `${styles.agentBadge} ${styles.agentBadgeActive}` : styles.agentBadge}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol} style={{ marginTop: 16 }}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Command Queue</p>
          <div className={styles.queueList}>
            {COMMAND_QUEUE.map((task) => (
              <div key={task.item} className={styles.queueItem}>
                <div>
                  <p className={styles.queueItemName}>{task.item}</p>
                  <p className={styles.queueItemOwner}>{task.owner}</p>
                </div>
                <span className={styles.queueItemTime}>{task.time}</span>
                <span className={styles.statusPill}>{task.state}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Operating Policy</p>
          <ul className={styles.policyList}>
            {POLICIES.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

type Submission = {
  id: string;
  agent_name: string;
  wallet_address: string;
  x_handle: string | null;
  notes: string | null;
  gitlawb_repo: string | null;
  b20_token_address: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type ManifestUpdate = {
  id: string;
  agent_name: string;
  status: string;
  diff_summary: string;
  luca_notes: string | null;
  created_at: string;
  proposed_data: {
    wallets?: { address: string; label: string; notes: string | null }[];
    source_repo?: string;
    xHandle?: string | null;
    ecosystem?: string | null;
  };
};

function ManifestSubmissions({ secret }: { secret: string }) {
  const [manifests, setManifests] = useState<ManifestUpdate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [acting, setActing]       = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  useEffect(() => {
    setLoading(true);
    fetch("/api/registry/pending", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; updates?: ManifestUpdate[]; error?: string }) => {
        if (d.ok) {
          setManifests((d.updates ?? []).filter((u) => u.luca_notes?.startsWith("Auto-fetched from")));
        } else {
          setError(d.error ?? "Failed to load manifest submissions");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    const res = await fetch("/api/registry/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({ id, action }),
    });
    const d = await res.json() as { ok: boolean };
    if (d.ok) setManifests((prev) => prev.map((m) => m.id === id ? { ...m, status: action === "approve" ? "approved" : "rejected" } : m));
    setActing(null);
  }

  return (
    <div className={styles.card} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p className={styles.cardTitle} style={{ margin: 0 }}>Manifest Submissions</p>
        {manifests.filter((m) => m.status === "pending").length > 0 && (
          <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: "#f59e0b22", color: "#f59e0b" }}>
            {manifests.filter((m) => m.status === "pending").length} pending
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
        Repo-submitted wallet manifests via <code>.agent/wallets.json</code>. Review and approve to upgrade agent profile.
      </p>

      {loading && <div style={{ color: "var(--muted)", fontSize: "0.83rem" }}>Loading…</div>}
      {!loading && error && <div className={styles.errorBox}>{error}</div>}
      {!loading && !error && manifests.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: 0 }}>No manifest submissions yet.</p>
      )}
      {!loading && !error && manifests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {manifests.map((m) => (
            <div key={m.id} style={{ padding: "12px 14px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>{m.agent_name}</strong>
                    <span style={{
                      padding: "1px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                      background: m.status === "pending" ? "#f59e0b22" : m.status === "approved" ? "var(--accent-soft)" : "#ef444422",
                      color: m.status === "pending" ? "#f59e0b" : m.status === "approved" ? "var(--accent)" : "#ef4444",
                    }}>{m.status}</span>
                    {m.proposed_data?.ecosystem && (
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600 }}>{m.proposed_data.ecosystem}</span>
                    )}
                  </div>
                  {m.proposed_data?.source_repo && (
                    <a href={m.proposed_data.source_repo} target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.75rem", color: "var(--accent)", wordBreak: "break-all", display: "block", marginBottom: 6 }}>
                      {m.proposed_data.source_repo}
                    </a>
                  )}
                  {m.proposed_data?.wallets && m.proposed_data.wallets.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {m.proposed_data.wallets.map((w) => (
                        <div key={w.address} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.75rem" }}>
                          <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 120 }}>{w.label}</span>
                          <code style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.7rem" }}>{w.address}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ margin: "6px 0 0", fontSize: "0.68rem", color: "var(--muted)" }}>
                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {m.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => act(m.id, "approve")} disabled={acting === m.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === m.id ? 0.5 : 1 }}>
                      Approve
                    </button>
                    <button type="button" onClick={() => act(m.id, "reject")} disabled={acting === m.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.07)", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === m.id ? 0.5 : 1 }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ClaimRequest = {
  id: string;
  agent_name: string;
  wallet_address: string;
  wallet_matched: boolean;
  status: string;
  created_at: string;
};

function ClaimsReview({ secret }: { secret: string }) {
  const [claims, setClaims]   = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [acting, setActing]   = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  useEffect(() => {
    setLoading(true);
    fetch("/api/registry/claims", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; claims?: ClaimRequest[]; error?: string }) => {
        if (d.ok) setClaims(d.claims ?? []);
        else setError(d.error ?? "Failed to load claims");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    const res = await fetch("/api/registry/claims", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, action }),
    });
    const d = await res.json() as { ok: boolean };
    if (d.ok) setClaims((prev) => prev.map((c) => c.id === id ? { ...c, status: action === "approve" ? "approved" : "rejected" } : c));
    setActing(null);
  }

  const pending = claims.filter((c) => c.status === "pending");

  return (
    <div className={styles.card} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p className={styles.cardTitle} style={{ margin: 0 }}>Profile Claim Requests</p>
        {pending.length > 0 && (
          <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: "#f59e0b22", color: "#f59e0b" }}>
            {pending.length} pending
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
        Agent teams claiming their profile by wallet match. Approve to set status to <strong>Claimed</strong>.
      </p>

      {loading && <div style={{ color: "var(--muted)", fontSize: "0.83rem" }}>Loading…</div>}
      {!loading && error && <div className={styles.errorBox}>{error}</div>}
      {!loading && !error && claims.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: 0 }}>No claim requests yet.</p>
      )}
      {!loading && !error && claims.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {claims.map((c) => (
            <div key={c.id} style={{ padding: "12px 14px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>{c.agent_name}</strong>
                    <span style={{
                      padding: "1px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                      background: c.status === "pending" ? "#f59e0b22" : c.status === "approved" ? "var(--accent-soft)" : "#ef444422",
                      color: c.status === "pending" ? "#f59e0b" : c.status === "approved" ? "var(--accent)" : "#ef4444",
                    }}>{c.status}</span>
                    <span style={{
                      padding: "1px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                      background: c.wallet_matched ? "var(--accent-soft)" : "rgba(248,113,113,0.1)",
                      color: c.wallet_matched ? "var(--accent)" : "#f87171",
                    }}>
                      {c.wallet_matched ? "Wallet matched" : "No wallet match"}
                    </span>
                  </div>
                  <code style={{ fontSize: "0.75rem", color: "var(--muted)", wordBreak: "break-all", display: "block", marginBottom: 4 }}>
                    {c.wallet_address}
                  </code>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", margin: 0 }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {c.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => act(c.id, "approve")} disabled={acting === c.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === c.id ? 0.5 : 1 }}>
                      Approve
                    </button>
                    <button type="button" onClick={() => act(c.id, "reject")} disabled={acting === c.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.07)", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === c.id ? 0.5 : 1 }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegistrySection({ secret }: { secret: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs]   = useState(true);
  const [subsError, setSubsError]       = useState("");
  const [filter, setFilter]             = useState<"pending" | "all">("pending");
  const [acting, setActing]             = useState<string | null>(null);
  const [seeding, setSeeding]           = useState(false);
  const [seedMsg, setSeedMsg]           = useState("");
  const [deleteTarget, setDeleteTarget] = useState("");
  const [deleting, setDeleting]         = useState(false);
  const [deleteMsg, setDeleteMsg]       = useState("");
  const [verdictTarget, setVerdictTarget] = useState("");
  const [refreshing, setRefreshing]       = useState(false);
  const [verdictMsg, setVerdictMsg]       = useState("");
  const [verdictPreview, setVerdictPreview] = useState("");

  const [editName,    setEditName]    = useState("");
  const [editHandle,  setEditHandle]  = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editSymbol,  setEditSymbol]  = useState("");
  const [editSaving,  setEditSaving]  = useState(false);
  const [editMsg,     setEditMsg]     = useState("");

  type RegistryStats = {
    total: number;
    byEcosystem: Record<string, number>;
    byStatus: Record<string, number>;
    byOutreach: Record<string, number>;
    coverage: {
      withWallets: number;
      withXHandle: number;
      withWebsite: number;
      withSymbol: number;
      withVerdict: number;
      checkedThisMonth: number;
    };
    generatedAt: string;
  };
  const [stats, setStats]               = useState<RegistryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError]     = useState("");
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkMsg, setBulkMsg]               = useState("");

  const [overrideAddr, setOverrideAddr]     = useState("");
  const [overrideType, setOverrideType]     = useState("eoa");
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideMsg, setOverrideMsg]       = useState("");

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  async function loadStats() {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await fetch("/api/admin/registry/stats", { headers });
      const d = await res.json() as RegistryStats & { ok: boolean; error?: string };
      if (d.ok) setStats(d);
      else setStatsError(d.error ?? "Failed");
    } catch {
      setStatsError("Network error");
    } finally {
      setStatsLoading(false);
    }
  }

  async function overrideWalletType(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideAddr.trim()) return;
    setOverrideSaving(true);
    setOverrideMsg("");
    try {
      const res = await fetch("/api/admin/registry/update-wallet-type", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ address: overrideAddr.trim(), address_type: overrideType }),
      });
      const d = await res.json() as { ok: boolean; agent_name?: string; address_type?: string; error?: string };
      if (d.ok) {
        setOverrideMsg(`✓ Set ${d.agent_name ?? overrideAddr} → ${d.address_type}`);
        setOverrideAddr("");
      } else {
        setOverrideMsg(`✗ ${d.error}`);
      }
    } catch {
      setOverrideMsg("✗ Network error");
    } finally {
      setOverrideSaving(false);
    }
  }

  async function bulkRefreshVerdicts() {
    setBulkRefreshing(true);
    setBulkMsg("");
    try {
      const res = await fetch("/api/admin/registry/refresh-all-verdicts", { method: "POST", headers });
      const d = await res.json() as { ok: boolean; succeeded?: number; failed?: number; total_eligible?: number; error?: string };
      if (d.ok) setBulkMsg(`✓ Refreshed ${d.succeeded} of ${d.total_eligible} agents${d.failed ? ` (${d.failed} failed)` : ""}`);
      else setBulkMsg(`✗ ${d.error}`);
    } catch {
      setBulkMsg("✗ Network error");
    } finally {
      setBulkRefreshing(false);
    }
  }

  async function seedRegistry() {
    setSeeding(true);
    setSeedMsg("");
    try {
      const res = await fetch("/api/admin/seed-registry", { method: "POST", headers });
      const d = await res.json() as { ok: boolean; message?: string; error?: string };
      setSeedMsg(d.ok ? `✓ ${d.message}` : `✗ ${d.error}`);
    } catch {
      setSeedMsg("✗ Network error");
    } finally {
      setSeeding(false);
    }
  }

  async function deleteAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteTarget.trim()) return;
    setDeleting(true);
    setDeleteMsg("");
    try {
      const res = await fetch("/api/admin/registry/delete-agent", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: deleteTarget.trim() }),
      });
      const d = await res.json() as { ok: boolean; deleted?: number; name?: string; error?: string };
      if (d.ok) {
        setDeleteMsg(`✓ Deleted "${d.name}" (${d.deleted} row${d.deleted === 1 ? "" : "s"})`);
        setDeleteTarget("");
      } else {
        setDeleteMsg(`✗ ${d.error}`);
      }
    } catch {
      setDeleteMsg("✗ Network error");
    } finally {
      setDeleting(false);
    }
  }

  async function refreshVerdict(e: React.FormEvent) {
    e.preventDefault();
    if (!verdictTarget.trim()) return;
    setRefreshing(true);
    setVerdictMsg("");
    setVerdictPreview("");
    try {
      const res = await fetch("/api/admin/registry/refresh-verdict", {
        method: "POST",
        headers,
        body: JSON.stringify({ agent_id: verdictTarget.trim().toLowerCase() }),
      });
      const d = await res.json() as { ok: boolean; agent?: string; verdict?: string; error?: string };
      if (d.ok) {
        setVerdictMsg(`✓ Verdict updated for "${d.agent}"`);
        setVerdictPreview(d.verdict ?? "");
        setVerdictTarget("");
      } else {
        setVerdictMsg(`✗ ${d.error}`);
      }
    } catch {
      setVerdictMsg("✗ Network error");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoadingSubs(true);
    setSubsError("");
    fetch(`/api/registry/submissions?status=${filter}`, { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; submissions?: Submission[]; error?: string }) => {
        if (d.ok) setSubmissions(d.submissions ?? []);
        else setSubsError(d.error ?? "Failed to load submissions");
      })
      .catch(() => setSubsError("Network error"))
      .finally(() => setLoadingSubs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, filter]);

  async function act(id: string, status: "approved" | "rejected") {
    setActing(id);
    const res = await fetch(`/api/registry/submissions/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    const d = await res.json() as { ok: boolean };
    if (d.ok) setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    setActing(null);
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Layer 3</p>
        <h1>Registry</h1>
        <p>Agent verification submissions and Luca&apos;s proposed changes.</p>
      </div>

      {/* Registry Stats */}
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p className={styles.cardTitle} style={{ margin: 0 }}>Registry Stats</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {stats && (
              <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                Updated {new Date(stats.generatedAt).toLocaleTimeString()}
              </span>
            )}
            <button type="button" onClick={loadStats} disabled={statsLoading}
              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: "0.75rem", cursor: statsLoading ? "not-allowed" : "pointer", opacity: statsLoading ? 0.5 : 1 }}>
              {statsLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
        {statsError && <p style={{ fontSize: "0.78rem", color: "#ef4444", margin: "0 0 8px" }}>{statsError}</p>}
        {!stats && !statsLoading && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>Click Refresh to load live stats from Supabase.</p>
        )}
        {stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Top line */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--fg)" }}>{stats.total}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 4 }}>agents indexed</span>
              </div>
              <div>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{stats.coverage.withWallets}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 4 }}>with wallets</span>
              </div>
              <div>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--fg)" }}>{stats.coverage.checkedThisMonth}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 4 }}>refreshed this month</span>
              </div>
            </div>
            {/* Ecosystem breakdown */}
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>By Ecosystem</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(stats.byEcosystem).sort((a, b) => b[1] - a[1]).map(([eco, count]) => (
                  <span key={eco} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--fg)" }}>
                    {eco} <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
            {/* Verification status */}
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>By Verification Status</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
                  <span key={st} style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--fg)" }}>
                    {st} <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
            {/* Coverage */}
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Profile Coverage</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "X handle", val: stats.coverage.withXHandle },
                  { label: "Website", val: stats.coverage.withWebsite },
                  { label: "Ticker", val: stats.coverage.withSymbol },
                  { label: "Verdict", val: stats.coverage.withVerdict },
                ].map(({ label, val }) => (
                  <div key={label} style={{ fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--fg)", fontWeight: 700 }}>{val}</span>
                    <span style={{ color: "var(--muted)", marginLeft: 4 }}>{label}</span>
                    <span style={{ color: "var(--muted)", marginLeft: 4, fontSize: "0.7rem" }}>({Math.round(val / stats.total * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Bulk refresh */}
            <div style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={bulkRefreshVerdicts} disabled={bulkRefreshing}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: bulkRefreshing ? "not-allowed" : "pointer", opacity: bulkRefreshing ? 0.5 : 1 }}>
                  {bulkRefreshing ? "Refreshing all verdicts…" : "Refresh All Verdicts →"}
                </button>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Luca calls this daily — or run manually here.</span>
              </div>
              {bulkMsg && (
                <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: bulkMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>{bulkMsg}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wallet Address Type Override */}
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <p className={styles.cardTitle} style={{ margin: "0 0 4px" }}>Wallet Type Override</p>
        <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--muted)" }}>
          Manually set the address_type for a wallet that was misclassified (e.g. ERC-4337 smart accounts detected as smart_contract). Use after confirming the wallet is a legitimate operator address.
        </p>
        <form onSubmit={overrideWalletType} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 260px" }}>
            <label style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>Wallet Address</label>
            <input
              value={overrideAddr}
              onChange={(e) => setOverrideAddr(e.target.value)}
              placeholder="0x..."
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--ink)", fontSize: "0.82rem", fontFamily: "monospace" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>Override Type</label>
            <select
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--ink)", fontSize: "0.82rem" }}
            >
              <option value="eoa">eoa</option>
              <option value="smart_account">smart_account (ERC-4337)</option>
              <option value="treasury_contract">treasury_contract</option>
              <option value="smart_contract">smart_contract</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
          <button type="submit" disabled={overrideSaving || !overrideAddr.trim()}
            style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: overrideSaving || !overrideAddr.trim() ? "not-allowed" : "pointer", opacity: overrideSaving || !overrideAddr.trim() ? 0.5 : 1 }}>
            {overrideSaving ? "Saving…" : "Override"}
          </button>
        </form>
        {overrideMsg && (
          <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: overrideMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>{overrideMsg}</p>
        )}
      </div>

      {/* Manifest Submissions (repo-submitted wallets.json) */}
      <ManifestSubmissions secret={secret} />

      {/* Profile Claim Requests */}
      <ClaimsReview secret={secret} />

      {/* Submissions queue */}
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p className={styles.cardTitle} style={{ margin: 0 }}>Verification Submissions</p>
            {pendingCount > 0 && (
              <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: "#ef444422", color: "#ef4444" }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["pending", "all"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={filter === f ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loadingSubs && <div style={{ color: "var(--muted)", fontSize: "0.83rem" }}>Loading…</div>}
        {!loadingSubs && subsError && <div className={styles.errorBox}>{subsError}</div>}
        {!loadingSubs && !subsError && submissions.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: 0 }}>No submissions yet.</p>
        )}
        {!loadingSubs && !subsError && submissions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {submissions.map((s) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start", padding: "10px 12px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>{s.agent_name}</strong>
                    {s.x_handle && <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{s.x_handle}</span>}
                    <span style={{
                      padding: "1px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                      background: s.status === "pending" ? "#f59e0b22" : s.status === "approved" ? "var(--accent-soft)" : "#ef444422",
                      color: s.status === "pending" ? "#f59e0b" : s.status === "approved" ? "var(--accent)" : "#ef4444",
                    }}>{s.status}</span>
                  </div>
                  <code style={{ fontSize: "0.75rem", color: "var(--ink)", wordBreak: "break-all" }}>{s.wallet_address}</code>
                  {s.gitlawb_repo && <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>Gitlawb: {s.gitlawb_repo}</p>}
                  {s.notes && <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>{s.notes}</p>}
                  {s.b20_token_address && (
                    <div style={{ margin: "6px 0 0", padding: "5px 10px", background: "#f59e0b10", border: "1px solid #f59e0b40", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#f59e0b" }}>B20 Token</span>
                      <code style={{ fontSize: "0.72rem", color: "var(--ink)", fontFamily: "monospace" }}>{s.b20_token_address}</code>
                      {s.b20_token_address.startsWith("0xb200") ? (
                        <span style={{ fontSize: "0.65rem", color: "#22c55e", fontWeight: 700 }}>✓ prefix ok</span>
                      ) : (
                        <span style={{ fontSize: "0.65rem", color: "#ef4444", fontWeight: 700 }}>✗ not 0xB200 — do not flag</span>
                      )}
                    </div>
                  )}
                  <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "var(--muted)" }}>
                    {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {s.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => act(s.id, "approved")} disabled={acting === s.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === s.id ? 0.5 : 1 }}>
                      Approve
                    </button>
                    <button type="button" onClick={() => act(s.id, "rejected")} disabled={acting === s.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.07)", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: acting === s.id ? 0.5 : 1 }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seed Registry */}
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className={styles.cardTitle} style={{ margin: "0 0 2px" }}>Seed Registry DB</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
              Writes all 84 agents from <code>data.ts</code> into Supabase. Run once to go fully DB-driven.
            </p>
            {seedMsg && (
              <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: seedMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>
                {seedMsg}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={seedRegistry}
            disabled={seeding}
            style={{ padding: "6px 16px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: seeding ? "not-allowed" : "pointer", opacity: seeding ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            {seeding ? "Seeding…" : "Seed Registry →"}
          </button>
        </div>
      </div>

      <div className={styles.registryBanner}>
        <div>
          <strong>Luca Updates Queue</strong>
          <p>Luca pushes weekly updates. Review proposed data changes before they go live on /registry.</p>
        </div>
        <Link href="/luca-admin/registry-updates" className={styles.actionBtn}>
          Open Queue →
        </Link>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>How it works</p>
          <ol className={styles.infoList}>
            <li>Luca scans agents weekly via Hermes cron on DO VPS</li>
            <li>Proposed changes POST to <code>/api/registry/luca-update</code></li>
            <li>Updates land in <code>registry_pending_updates</code></li>
            <li>You review and approve or reject at the queue</li>
            <li>Approved changes write to <code>registry_agents</code> and go live</li>
          </ol>
        </div>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Update types</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {[
              { label: "New Agent",     color: "var(--accent)" },
              { label: "Score Update",  color: "var(--blue)" },
              { label: "Wallet Update", color: "#f59e0b" },
              { label: "Status Change", color: "#a78bfa" },
            ].map((t) => (
              <span key={t.label} style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, background: `color-mix(in srgb, ${t.color} 12%, transparent)`, color: t.color, border: `1px solid color-mix(in srgb, ${t.color} 25%, transparent)` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Agent Profile */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.cardTitle}>Edit Agent Profile</p>
        <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--muted)" }}>
          Update X handle, website URL, and ticker symbol directly in the DB. Enter the exact agent name as it appears in the registry.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editName.trim()) return;
            setEditSaving(true);
            setEditMsg("");
            try {
              const body: Record<string, string> = { name: editName.trim() };
              if (editHandle.trim() !== "") body.xHandle = editHandle.trim();
              if (editWebsite.trim() !== "") body.website = editWebsite.trim();
              if (editSymbol.trim() !== "") body.symbol = editSymbol.trim();
              const res = await fetch("/api/admin/registry/update-agent", {
                method: "PATCH",
                headers,
                body: JSON.stringify(body),
              });
              const d = await res.json() as { ok: boolean; name?: string; error?: string };
              if (d.ok) {
                setEditMsg(`✓ Updated "${d.name}"`);
                setEditHandle(""); setEditWebsite(""); setEditSymbol("");
              } else {
                setEditMsg(`✗ ${d.error}`);
              }
            } catch {
              setEditMsg("✗ Network error");
            } finally {
              setEditSaving(false);
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Exact agent name, e.g. AEON" className={styles.formInput} style={{ flex: "2 1 160px" }} required />
            <input value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="X handle, e.g. @aeon_agent (leave blank to skip)" className={styles.formInput} style={{ flex: "2 1 180px" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="Website URL (leave blank to skip)" className={styles.formInput} style={{ flex: "3 1 200px" }} />
            <input value={editSymbol} onChange={(e) => setEditSymbol(e.target.value)} placeholder="Ticker, e.g. $AEON (leave blank to skip)" className={styles.formInput} style={{ flex: "1 1 120px" }} />
            <button type="submit" disabled={editSaving || !editName.trim()}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: editSaving || !editName.trim() ? "not-allowed" : "pointer", opacity: editSaving || !editName.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>
              {editSaving ? "Saving…" : "Save →"}
            </button>
          </div>
        </form>
        {editMsg && (
          <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: editMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>
            {editMsg}
          </p>
        )}
      </div>

      {/* Refresh Luca Verdict */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.cardTitle}>Refresh Luca Verdict</p>
        <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--muted)" }}>
          Generates a fresh verdict from live registry data — treasury health, settlement pattern, wallet status, activity score —
          and writes it back to the agent&apos;s profile. Enter the agent slug (e.g. <code>aeon</code>, <code>luca</code>).
        </p>
        <form onSubmit={refreshVerdict} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={verdictTarget}
            onChange={(e) => setVerdictTarget(e.target.value)}
            placeholder="Agent slug, e.g. aeon"
            className={styles.formInput}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button
            type="submit"
            disabled={refreshing || !verdictTarget.trim()}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: refreshing || !verdictTarget.trim() ? "not-allowed" : "pointer", opacity: refreshing || !verdictTarget.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
          >
            {refreshing ? "Generating…" : "Refresh Verdict →"}
          </button>
        </form>
        {verdictMsg && (
          <p style={{ margin: "8px 0 4px", fontSize: "0.8rem", color: verdictMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>
            {verdictMsg}
          </p>
        )}
        {verdictPreview && (
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6, padding: "8px 10px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 6 }}>
            {verdictPreview}
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className={styles.card} style={{ marginTop: 16, border: "1px solid rgba(239,68,68,0.25)" }}>
        <p className={styles.cardTitle} style={{ color: "#ef4444" }}>Danger Zone — Delete Agent Row</p>
        <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--muted)" }}>
          Permanently removes an agent and all its wallet rows from the DB. Use this to clean up ghost rows
          before re-submitting a manifest (e.g. <code>AEON</code> vs <code>Aeon</code> casing mismatches).
          Enter the <strong>exact name</strong> as it appears in the DB.
        </p>
        <form onSubmit={deleteAgent} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={deleteTarget}
            onChange={(e) => setDeleteTarget(e.target.value)}
            placeholder="Exact agent name, e.g. AEON"
            className={styles.formInput}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button
            type="submit"
            disabled={deleting || !deleteTarget.trim()}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: deleting || !deleteTarget.trim() ? "not-allowed" : "pointer", opacity: deleting || !deleteTarget.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
          >
            {deleting ? "Deleting…" : "Delete Agent →"}
          </button>
        </form>
        {deleteMsg && (
          <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: deleteMsg.startsWith("✓") ? "var(--accent)" : "#ef4444" }}>
            {deleteMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Attribution Section ───────────────────────────────────────────────────────

type AttributionEntry = {
  name: string;
  slug: string;
  ecosystem: string;
  wallets_declared: number;
  attributed: boolean | null;
  reason: string | null;
  revenue_usd: number | null;
  expenses_usd: number | null;
  tx_count: number | null;
  last_refresh: string | null;
};

type AttributionData = {
  ok: boolean;
  total_indexed: number;
  total_attributed: number;
  total_unattributed_with_wallets: number;
  total_no_wallets: number;
  agents: AttributionEntry[];
  generated_at: string;
};

function AttributionSection({ secret }: { secret: string }) {
  const [data, setData]       = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<"all" | "attributed" | "anomaly" | "no-wallets">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attribution", {
        headers: { "x-internal-secret": secret },
      });
      const json = await res.json() as AttributionData;
      if (!json.ok) throw new Error("API returned ok: false");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const fmtUSD = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const fmtTime = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  const filtered = (data?.agents ?? []).filter((a) => {
    if (filter === "attributed")  return a.attributed === true;
    if (filter === "anomaly")     return a.attributed === false && a.wallets_declared > 0;
    if (filter === "no-wallets")  return a.wallets_declared === 0;
    return true;
  });

  return (
    <div>
      <div className={styles.sectionHead}>
        <h2>Attribution Dashboard</h2>
        <p>Per-agent attribution status — which agents are being tracked and why some are not.</p>
      </div>

      {/* Summary tiles */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Indexed",    value: data.total_indexed,                     color: "var(--fg)" },
            { label: "Attributed",       value: data.total_attributed,                  color: "#6DB874" },
            { label: "Anomaly (wallets, not attributed)", value: data.total_unattributed_with_wallets, color: "#f59e0b" },
            { label: "No Wallets",       value: data.total_no_wallets,                  color: "var(--muted)" },
          ].map((t) => (
            <div key={t.label} style={{ padding: "12px 14px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", fontWeight: 600 }}>{t.label}</p>
              <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, fontFamily: "monospace", color: t.color }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {(["all", "attributed", "anomaly", "no-wallets"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)",
              background: filter === f ? "var(--accent)" : "var(--surface-soft)",
              color: filter === f ? "#fff" : "var(--fg)",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : f === "attributed" ? "Attributed" : f === "anomaly" ? "Anomaly" : "No Wallets"}
            {data && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {f === "all"        ? data.total_indexed
                : f === "attributed" ? data.total_attributed
                : f === "anomaly"    ? data.total_unattributed_with_wallets
                : data.total_no_wallets}
              </span>
            )}
          </button>
        ))}
        <button type="button" onClick={load} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface-soft)", color: "var(--fg)", fontSize: "0.75rem", cursor: "pointer" }}>
          ↺ Refresh
        </button>
      </div>

      {loading && <div className={styles.stateBox}>Loading attribution data…</div>}
      {error   && <div className={styles.stateBox} style={{ color: "#ef4444" }}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 90px 110px 110px 140px", gap: 10, padding: "8px 14px", background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
            {["Agent", "Wallets", "Status", "Revenue", "Expenses", "Txs", "Last Refresh"].map((h) => (
              <span key={h} style={{ fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--muted)", fontSize: "0.83rem" }}>No agents in this filter.</div>
          )}

          {filtered.map((a) => {
            const statusColor = a.attributed === true ? "#6DB874" : a.attributed === false && a.wallets_declared > 0 ? "#f59e0b" : "var(--muted)";
            const statusLabel = a.attributed === true ? "✓ attributed" : a.attributed === false ? "✗ not attributed" : "not scanned";
            return (
              <div key={a.slug} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 90px 110px 110px 140px", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.name}</span>
                  <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--muted)" }}>{a.ecosystem}</span>
                  {a.reason && (
                    <div style={{ fontSize: "0.68rem", color: "#f59e0b", marginTop: 2 }}>{a.reason}</div>
                  )}
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)" }}>{a.wallets_declared}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6DB874" }}>{fmtUSD(a.revenue_usd)}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)" }}>{fmtUSD(a.expenses_usd)}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)" }}>{a.tx_count?.toLocaleString() ?? "—"}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{fmtTime(a.last_refresh)}</span>
              </div>
            );
          })}
        </div>
      )}

      {data && (
        <p style={{ marginTop: 10, fontSize: "0.68rem", color: "var(--muted)", fontStyle: "italic" }}>
          Generated {fmtTime(data.generated_at)} · Reflects DB cache state. Trigger a refresh to update.
        </p>
      )}
    </div>
  );
}

function EconomicsSection() {
  const [period, setPeriod]   = useState<EcoPeriod>("7d");
  const [data, setData]       = useState<EconomicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (p: EcoPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/luca/economics?period=${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to load");
      setData(json as EconomicsResponse);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const s = data?.summary;
  const netPos = s?.netAgentPosition ?? 0;
  const netColor = netPos > 0.01 ? "var(--accent)" : netPos < -0.01 ? "#ef4444" : "var(--ink)";

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Agent Economics</p>
        <h1>Luca Economics</h1>
        <p>Inference spend, revenue, and wallet flows — Luca&apos;s financial self-portrait.</p>
      </div>

      <div className={styles.ecoTopRow}>
        {(["7d", "30d"] as EcoPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={period === p ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn}
          >
            {p}
          </button>
        ))}
        <button type="button" onClick={() => load(period)} disabled={loading} className={styles.ghostBtn}>
          {loading ? "…" : "Refresh"}
        </button>
        {lastRefresh && (
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 4 }}>
            refreshed {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {loading && !data && <div className={styles.stateBox}>Loading economics…</div>}

      {s && (
        <>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12 }}>
            Last {s.periodDays} days · {s.eventCount} event{s.eventCount === 1 ? "" : "s"}
          </div>

          <div className={`${styles.netBanner} ${netPos > 0.01 ? styles.netBannerPos : netPos < -0.01 ? styles.netBannerNeg : ""}`}>
            <span className={styles.netBannerLabel}>Net Agent Position</span>
            <span className={styles.netBannerValue} style={{ color: netColor }}>
              {sign(netPos)}{usd(netPos)}
            </span>
          </div>

          <div className={styles.card}>
            {[
              { label: "Inference Spend",   value: `-${usd(s.totalInferenceSpend)}`,   color: s.totalInferenceSpend > 0 ? "#ef4444" : undefined,    sub: undefined },
              { label: "Inference Revenue", value: `+${usd(s.totalInferenceRevenue)}`, color: s.totalInferenceRevenue > 0 ? "var(--accent)" : undefined, sub: undefined },
              { label: "Provider Spend",    value: `-${usd(s.providerSpend)}`,         color: undefined,                                              sub: s.topProvider ? `Top: ${s.topProvider}` : undefined },
              { label: "Fallback Usage",    value: `-${usd(s.fallbackProviderSpend)}`, color: undefined,                                              sub: `${s.fallbackUsageCount} call${s.fallbackUsageCount === 1 ? "" : "s"}` },
              { label: "API Costs",         value: `-${usd(s.apiCosts)}`,              color: undefined,                                              sub: undefined },
              { label: "Wallet Inflows",    value: `+${usd(s.walletInflows)}`,         color: s.walletInflows > 0 ? "var(--accent)" : undefined,     sub: undefined },
              { label: "Wallet Outflows",   value: `-${usd(s.walletOutflows)}`,        color: undefined,                                              sub: undefined },
              { label: "Events Logged",     value: String(s.eventCount),               color: "var(--blue)",                                          sub: undefined },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className={styles.dataRow}>
                <span className={styles.dataRowLabel}>{label}</span>
                <div className={styles.dataRowRight}>
                  <span className={styles.dataRowValue} style={{ color: color ?? "var(--ink)" }}>{value}</span>
                  {sub && <div className={styles.dataRowSub}>{sub}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.verdictBox} style={{ marginTop: 12 }}>
            <p className={styles.verdictLabel}>Luca Verdict</p>
            <p className={styles.verdictText}>{s.lucaVerdict}</p>
          </div>

          {data?.report.summary && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
              {data.report.summary}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function GrowthSection({ secret }: { secret: string }) {
  const [data, setData]       = useState<GrowthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/admin/growth", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json() as Promise<GrowthPayload>)
      .then((d) => { if (d.ok) setData(d); else setError(d.error ?? "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const TODAY_CARDS = [
    { label: "Wallet Scans",         value: data?.today?.wallet_scans },
    { label: "Reports Generated",    value: data?.today?.reports_generated },
    { label: "API Calls",            value: data?.today?.api_calls },
    { label: "Unique Wallets",       value: data?.today?.unique_wallets },
    { label: "Luca Interactions",    value: data?.today?.luca_interactions },
    { label: "Registry Submissions", value: data?.today?.registry_submissions },
    { label: "Verified Agents",      value: data?.today?.verified_agents },
    { label: "Failed Scans",         value: data?.today?.failed_scans },
    { label: "Endpoint Calls",       value: data?.today?.endpoint_calls },
  ];

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Growth OS</p>
        <h1>Platform Metrics</h1>
        <p>Internal tracking — wallet scans, API usage, registry activity.</p>
      </div>

      {loading && <div className={styles.stateBox}>Loading…</div>}

      {!loading && error && (
        <div className={styles.errorBox}>
          {error}
          <p style={{ margin: "6px 0 0", fontSize: "0.78rem", opacity: 0.75 }}>
            If tables are missing, run <code>supabase/growth-schema.sql</code> first.
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className={styles.subHead}>Today</p>
          <div className={styles.growthGrid}>
            {TODAY_CARDS.map((m) => (
              <div key={m.label} className={styles.growthCard}>
                <p>{m.label}</p>
                <strong>{n(m.value)}</strong>
              </div>
            ))}
          </div>

          {data && data.sevenDay.length > 0 && (
            <>
              <p className={styles.subHead}>Last 7 Days</p>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Date</th><th>Scans</th><th>Reports</th>
                      <th>API</th><th>Wallets</th><th>Failed</th><th>Registry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sevenDay.map((row) => (
                      <tr key={row.date}>
                        <td>{fmtDate(row.date)}</td>
                        <td>{n(row.wallet_scans)}</td>
                        <td>{n(row.reports_generated)}</td>
                        <td>{n(row.api_calls)}</td>
                        <td>{n(row.unique_wallets)}</td>
                        <td style={{ color: row.failed_scans > 0 ? "#ef4444" : undefined }}>
                          {n(row.failed_scans)}
                        </td>
                        <td>{n(row.registry_submissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data && data.sevenDay.length === 0 && (
            <div className={styles.stateBox}>No daily metrics yet — data populates as activity happens.</div>
          )}

          <div className={styles.twoCol} style={{ marginTop: 16 }}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Top Scanned Wallets · 7d</p>
              {data && data.topWallets.length > 0 ? (
                <div className={styles.walletList}>
                  {data.topWallets.map((w, i) => (
                    <div key={w.wallet} className={styles.walletRow}>
                      <span className={styles.walletRank}>#{i + 1}</span>
                      <code className={styles.walletAddr}>{shortAddr(w.wallet)}</code>
                      <span className={styles.walletCount}>{w.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: 0 }}>No scans logged yet.</p>
              )}
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Registry Activity</p>
              {data && data.registryEvents.length > 0 ? (
                <div className={styles.queueList}>
                  {data.registryEvents.slice(0, 8).map((e, i) => {
                    const c = e.event_type === "approval" ? "var(--accent)" : e.event_type === "rejection" ? "#ef4444" : "#f59e0b";
                    return (
                      <div key={i} className={styles.queueItem}>
                        <div>
                          <p className={styles.queueItemName}>{e.agent_name ?? "—"}</p>
                          <p className={styles.queueItemOwner}>{e.update_type ?? e.event_type}</p>
                        </div>
                        <span className={styles.queueItemTime}>{fmtDate(e.created_at)}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>
                          {e.event_type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: 0 }}>No registry events yet.</p>
              )}
            </div>
          </div>

          {data && data.failedScans.length > 0 && (
            <>
              <p className={styles.subHead} style={{ color: "#ef4444" }}>Failed Scans</p>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead><tr><th>Wallet</th><th>Reason</th><th>Time</th></tr></thead>
                  <tbody>
                    {data.failedScans.map((f, i) => (
                      <tr key={i}>
                        <td><code>{shortAddr(f.wallet ?? "unknown")}</code></td>
                        <td>{String(f.metadata?.reason ?? "—")}</td>
                        <td>{fmtDate(f.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Trend signals */}
          {data && data.sevenDay.length >= 2 && (() => {
            const rows7 = data.sevenDay;
            const half  = Math.floor(rows7.length / 2);
            const recent = rows7.slice(half);
            const prior  = rows7.slice(0, half);
            const sumField = (arr: DailyMetric[], f: keyof DailyMetric) =>
              arr.reduce((t, r) => t + ((r[f] as number) ?? 0), 0);
            const trend = (a: number, b: number): { label: string; color: string } => {
              if (b === 0) return a > 0 ? { label: "Growing", color: "#22c55e" } : { label: "No data", color: "#6b7280" };
              const pct = ((a - b) / b) * 100;
              if (pct >= 10)  return { label: `▲ ${pct.toFixed(0)}%`, color: "#22c55e" };
              if (pct <= -10) return { label: `▼ ${Math.abs(pct).toFixed(0)}%`, color: "#ef4444" };
              return { label: "Flat", color: "#f59e0b" };
            };
            const signals = [
              { label: "Wallet Scans",         a: sumField(recent, "wallet_scans"),         b: sumField(prior, "wallet_scans") },
              { label: "API Calls",             a: sumField(recent, "api_calls"),            b: sumField(prior, "api_calls") },
              { label: "Luca Interactions",     a: sumField(recent, "luca_interactions"),    b: sumField(prior, "luca_interactions") },
              { label: "Registry Submissions",  a: sumField(recent, "registry_submissions"), b: sumField(prior, "registry_submissions") },
            ];
            return (
              <>
                <p className={styles.subHead}>Trend Signals (recent vs prior half of 7d)</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  {signals.map(({ label, a, b }) => {
                    const t = trend(a, b);
                    return (
                      <div key={label} style={{ background: "var(--surface)", border: `1px solid ${t.color}44`, borderRadius: 8, padding: "10px 16px", minWidth: 140 }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0 0 4px" }}>{label}</p>
                        <p style={{ fontSize: "1.1rem", fontWeight: 700, color: t.color, margin: 0 }}>{t.label}</p>
                        <p style={{ fontSize: "0.68rem", color: "var(--muted)", margin: "2px 0 0" }}>
                          {n(a)} vs {n(b)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ── Comm Intel section ────────────────────────────────────────────────────────

const COMM_PLATFORMS = ["wiretap", "telegram", "x", "email", "discord", "farcaster", "other"] as const;
const COMM_LABELS = [
  "payment request observed",
  "settlement not confirmed",
  "needs wallet confirmation",
  "reconciliation candidate",
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  wiretap:   "#f59e0b",
  telegram:  "var(--blue)",
  x:         "var(--ink)",
  email:     "#a78bfa",
  discord:   "#6366f1",
  farcaster: "#a78bfa",
  other:     "var(--muted)",
};

const LABEL_COLOR: Record<string, string> = {
  "payment request observed":  "#f59e0b",
  "settlement not confirmed":  "#ef4444",
  "needs wallet confirmation": "var(--blue)",
  "reconciliation candidate":  "#a78bfa",
};

type CommEntry = {
  id?: string;
  agent_name: string;
  platform: string;
  handle: string;
  url?: string | null;
  confidence: string;
  labels: string[];
  notes?: string | null;
};

const BLANK_FORM = { agent_name: "", platform: "wiretap", handle: "", url: "", confidence: "unverified", labels: [] as string[], notes: "" };

function CommIntelSection({ secret }: { secret: string }) {
  const [entries, setEntries]   = useState<CommEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [addOpen, setAddOpen]   = useState(false);
  const [form, setForm]         = useState({ ...BLANK_FORM });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch("/api/registry/comm-identities", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: CommEntry[]; error?: string }) => {
        if (d.ok) setEntries(d.data ?? []);
        else setError(d.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  function toggleLabel(label: string) {
    setForm((f) => ({
      ...f,
      labels: f.labels.includes(label) ? f.labels.filter((l) => l !== label) : [...f.labels, label],
    }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/registry/comm-identities", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...form, url: form.url || null, notes: form.notes || null }),
    });
    const data = await res.json() as { ok: boolean; id?: string; error?: string };
    if (data.ok && data.id) {
      setEntries((prev) => [{ ...form, id: data.id, url: form.url || null, notes: form.notes || null }, ...prev]);
      setForm({ ...BLANK_FORM });
      setAddOpen(false);
    } else {
      setSaveError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/registry/comm-identities/${id}`, { method: "DELETE", headers });
    const data = await res.json() as { ok: boolean };
    if (data.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  }

  const filtered = entries.filter(
    (e) => !search || e.agent_name.toLowerCase().includes(search.toLowerCase()) || e.handle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Intelligence</p>
        <h1>Comm Intel</h1>
        <p>Agent communication identities — admin only. Not shown publicly.</p>
      </div>

      <div className={styles.registryBanner}>
        <div>
          <strong>Comm identities are not wallet verification</strong>
          <p>Confirmed handle ≠ verified wallet. Payment request observed ≠ confirmed revenue.</p>
        </div>
        <button type="button" onClick={() => setAddOpen((v) => !v)} className={styles.actionBtn}>
          {addOpen ? "Cancel" : "+ Add Identity"}
        </button>
      </div>

      {addOpen && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <p className={styles.cardTitle}>New Identity</p>
          <form onSubmit={handleAdd}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Agent Name *</label>
                <input required value={form.agent_name} onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))}
                  placeholder="e.g. Bankr" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Platform *</label>
                <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className={styles.formSelect}>
                  {COMM_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Handle *</label>
                <input required value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                  placeholder="@handle or ID" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL</label>
                <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://…" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confidence *</label>
                <select value={form.confidence} onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))} className={styles.formSelect}>
                  <option value="unverified">unverified</option>
                  <option value="confirmed">confirmed</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes</label>
                <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Context…" className={styles.formInput} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <p className={styles.formLabel}>Labels</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                {COMM_LABELS.map((label) => {
                  const active = form.labels.includes(label);
                  const c = LABEL_COLOR[label];
                  return (
                    <button key={label} type="button" onClick={() => toggleLabel(label)}
                      style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${active ? c : "var(--line)"}`,
                        background: active ? `color-mix(in srgb, ${c} 12%, transparent)` : "transparent",
                        color: active ? c : "var(--muted)" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {saveError && <p className={styles.authError}>{saveError}</p>}
            <button type="submit" disabled={saving} className={styles.actionBtn}>
              {saving ? "Saving…" : "Save Identity"}
            </button>
          </form>
        </div>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents or handles…"
        className={styles.formInput} style={{ marginBottom: 12 }} />

      {loading && <div className={styles.stateBox}>Loading comm identities…</div>}
      {!loading && error && <div className={styles.errorBox}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.stateBox}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No comm identities yet</p>
          <p style={{ margin: 0, fontSize: "0.83rem" }}>Add the first one above.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((entry) => {
            const pc = PLATFORM_COLORS[entry.platform] ?? "var(--muted)";
            const cc = entry.confidence === "confirmed" ? "var(--accent)" : "#f59e0b";
            return (
              <div key={entry.id ?? entry.handle} className={styles.card}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>{entry.agent_name}</strong>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
                        background: `color-mix(in srgb, ${pc} 12%, transparent)`, color: pc }}>
                        {entry.platform}
                      </span>
                      <code style={{ fontSize: "0.8rem", color: "var(--ink)" }}>{entry.handle}</code>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
                        background: `color-mix(in srgb, ${cc} 12%, transparent)`, color: cc }}>
                        {entry.confidence}
                      </span>
                    </div>
                    {entry.labels.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
                        {entry.labels.map((l) => {
                          const lc = LABEL_COLOR[l] ?? "var(--muted)";
                          return (
                            <span key={l} style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                              background: `color-mix(in srgb, ${lc} 12%, transparent)`, color: lc }}>
                              {l}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {entry.notes && <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: 0 }}>{entry.notes}</p>}
                    {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: "0.75rem" }}>{entry.url}</a>}
                  </div>
                  {entry.id && (
                    <button type="button" onClick={() => handleDelete(entry.id!)} disabled={deleting === entry.id}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.28)",
                        background: "rgba(239,68,68,0.07)", color: "#ef4444", fontSize: "0.75rem",
                        fontWeight: 600, cursor: "pointer", opacity: deleting === entry.id ? 0.5 : 1 }}>
                      {deleting === entry.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportsSection({ secret }: { secret: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState("");

  async function sendNow() {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/cron/daily-report", { headers: { Authorization: `Bearer ${secret}` } });
      const data = await res.json() as { ok: boolean; preview?: string; error?: string };
      if (data.ok) { setPreview(data.preview ?? ""); setStatus("done"); }
      else { setError(data.error ?? "Failed to send"); setStatus("error"); }
    } catch { setError("Network error"); setStatus("error"); }
  }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>ZHC Ops</p>
        <h1>Daily Reports</h1>
        <p>Luca sends a daily TLDR to your Telegram at 8:00 UTC. Trigger manually here.</p>
      </div>

      <div className={styles.registryBanner}>
        <div>
          <strong>Send Daily Ops Report</strong>
          <p>Pulls today&apos;s metrics — scans, API calls, registry activity, failed scans — and sends to Telegram.</p>
        </div>
        <button type="button" onClick={sendNow} disabled={status === "sending"} className={styles.actionBtn}>
          {status === "sending" ? "Sending…" : status === "done" ? "Sent ✓" : "Send Now →"}
        </button>
      </div>

      {status === "error" && <div className={styles.errorBox}>{error}</div>}

      {status === "done" && preview && (
        <div className={styles.card} style={{ marginTop: 16 }}>
          <p className={styles.cardTitle}>Report Preview · Just sent to Telegram</p>
          <pre className={styles.reportPre}>{preview.replace(/<[^>]+>/g, "")}</pre>
        </div>
      )}

      <div className={styles.twoCol} style={{ marginTop: 16 }}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Schedule</p>
          <ol className={styles.infoList}>
            <li>Luca on VPS calls <code>GET /api/cron/daily-report</code> daily</li>
            <li>Pulls wallet scans, API calls, failed scans, registry events</li>
            <li>Formats a TLDR and sends to <code>LUCA_ADMIN_CHAT_ID</code></li>
            <li>Use &quot;Send Now&quot; above to trigger manually anytime</li>
          </ol>
        </div>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Required env vars</p>
          <div className={styles.envList}>
            {["TELEGRAM_BOT_TOKEN", "LUCA_ADMIN_CHAT_ID", "ZETTA_INTERNAL_SECRET"].map((key) => (
              <div key={key} className={styles.envRow}>
                <code>{key}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Truth Engine Section ──────────────────────────────────────────────────────

const CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"] as const;

type IndexWalletResult = {
  ok:                boolean;
  provider_used:     string;
  txs_fetched:       number;
  events_classified: number;
  evidence_upgrade:  string | null;
  fetch_error:       string | null;
  errors:            string[];
  classified_counts: Record<string, number>;
  error?:            string;
};

type IndexAllResult = {
  ok:              boolean;
  wallets_found:   number;
  wallets_indexed: number;
  wallets_skipped: number;
  truncated:       boolean;
  truncated_at:    number | null;
  totals: {
    txs_fetched:       number;
    events_classified: number;
    evidence_upgrades: number;
  };
  per_wallet: {
    agent_slug:        string;
    address:           string;
    chain:             string;
    provider_used:     string;
    txs_fetched:       number;
    events_classified: number;
    evidence_upgrade:  string | null;
    classified_counts: Record<string, number>;
    fetch_error:       string | null;
    insert_errors:     number;
    skipped:           boolean;
    skip_reason?:      string;
  }[];
  error?: string;
};

const CLS_COLOR: Record<string, string> = {
  settlement_revenue:  "var(--accent)",
  fee_received:        "#6366f1",
  inference_spend:     "var(--blue)",
  treasury_movement:   "#f59e0b",
  token_distribution:  "#a78bfa",
  external_expense:    "var(--muted)",
  unknown:             "var(--muted)",
};

function ClassifiedCountBadges({ counts }: { counts: Record<string, number> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cls, n]) => (
        <span key={cls} style={{
          padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
          background: `color-mix(in srgb, ${CLS_COLOR[cls] ?? "var(--muted)"} 14%, transparent)`,
          color: CLS_COLOR[cls] ?? "var(--muted)",
          border: `1px solid color-mix(in srgb, ${CLS_COLOR[cls] ?? "var(--muted)"} 28%, transparent)`,
        }}>
          {cls} · {n}
        </span>
      ))}
    </div>
  );
}

function TruthEngineSection({ secret }: { secret: string }) {
  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  // ── Single wallet indexer ────────────────────────────────────────────────────
  const [walletForm, setWalletForm] = useState({
    agent_slug: "", address: "", chain: "base" as string, limit: "50",
  });
  const [walletResult, setWalletResult] = useState<IndexWalletResult | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  async function indexWallet(e: React.FormEvent) {
    e.preventDefault();
    setWalletLoading(true);
    setWalletError("");
    setWalletResult(null);
    try {
      const res = await fetch("/api/admin/truth-engine/index-wallet", {
        method: "POST", headers,
        body: JSON.stringify({
          agent_slug: walletForm.agent_slug.trim().toLowerCase(),
          address:    walletForm.address.trim().toLowerCase(),
          chain:      walletForm.chain,
          limit:      parseInt(walletForm.limit, 10) || 50,
        }),
      });
      const d = await res.json() as IndexWalletResult;
      setWalletResult(d);
      if (!d.ok && d.error) setWalletError(d.error);
    } catch {
      setWalletError("Network error");
    } finally {
      setWalletLoading(false);
    }
  }

  // ── Index all ────────────────────────────────────────────────────────────────
  const [allForm, setAllForm]     = useState({ limit: "200", max_wallets: "50" });
  const [allResult, setAllResult] = useState<IndexAllResult | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError]   = useState("");

  async function indexAll(e: React.FormEvent) {
    e.preventDefault();
    setAllLoading(true);
    setAllError("");
    setAllResult(null);
    try {
      const res = await fetch("/api/admin/truth-engine/index-all", {
        method: "POST", headers,
        body: JSON.stringify({
          limit:       parseInt(allForm.limit, 10) || 200,
          max_wallets: parseInt(allForm.max_wallets, 10) || 50,
        }),
      });
      const d = await res.json() as IndexAllResult;
      setAllResult(d);
      if (!d.ok && d.error) setAllError(d.error);
    } catch {
      setAllError("Network error");
    } finally {
      setAllLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Observed Truth · Phase 2</p>
        <h1>Truth Engine</h1>
        <p>On-chain indexing and revenue classification. Conservative by design — unknown beats overclaim.</p>
      </div>

      {/* Evidence posture note */}
      <div className={styles.registryBanner} style={{ marginBottom: 16 }}>
        <div>
          <strong>Classification posture</strong>
          <p>
            settlement_revenue only fires for inbound from a known registry wallet.
            fee_received is stablecoin inflow — medium confidence, not confirmed revenue.
            Evidence upgrades to verified only at ≥3 distinct fee senders or a registry settlement.
          </p>
        </div>
      </div>

      {/* ── Single wallet ── */}
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <p className={styles.cardTitle}>Index Single Wallet</p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
          Fetch and classify on-chain transactions for one wallet. Safe to re-run — idempotent.
        </p>
        <form onSubmit={indexWallet}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Agent Slug *</label>
              <input required value={walletForm.agent_slug}
                onChange={(e) => setWalletForm((f) => ({ ...f, agent_slug: e.target.value }))}
                placeholder="e.g. nipmod" className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Wallet Address *</label>
              <input required value={walletForm.address}
                onChange={(e) => setWalletForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="0x…" className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Chain *</label>
              <select value={walletForm.chain}
                onChange={(e) => setWalletForm((f) => ({ ...f, chain: e.target.value }))}
                className={styles.formSelect}>
                {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Limit (txs)</label>
              <input type="number" min={10} max={500} value={walletForm.limit}
                onChange={(e) => setWalletForm((f) => ({ ...f, limit: e.target.value }))}
                className={styles.formInput} />
            </div>
          </div>
          <button type="submit" disabled={walletLoading}
            style={{ marginTop: 8, padding: "6px 16px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: walletLoading ? "not-allowed" : "pointer", opacity: walletLoading ? 0.6 : 1 }}>
            {walletLoading ? "Indexing…" : "Index Wallet →"}
          </button>
        </form>

        {walletError && <div className={styles.errorBox} style={{ marginTop: 10 }}>{walletError}</div>}

        {walletResult && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: walletResult.ok ? "var(--accent)" : "#ef4444" }}>
                {walletResult.ok ? "✓ Indexed" : "✗ Error"}
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {walletResult.txs_fetched} txs · {walletResult.events_classified} classified · provider: {walletResult.provider_used}
              </span>
              {walletResult.evidence_upgrade && (
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, background: "var(--accent-soft)", color: "var(--accent)" }}>
                  evidence → {walletResult.evidence_upgrade}
                </span>
              )}
            </div>
            {walletResult.fetch_error && (
              <p style={{ fontSize: "0.75rem", color: "#f59e0b", margin: "0 0 6px" }}>⚠ {walletResult.fetch_error}</p>
            )}
            {Object.keys(walletResult.classified_counts ?? {}).length > 0 && (
              <ClassifiedCountBadges counts={walletResult.classified_counts} />
            )}
            {(walletResult.errors ?? []).length > 0 && (
              <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 6 }}>
                {walletResult.errors.length} insert error(s): {walletResult.errors[0]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Index all ── */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Index All Eligible Wallets</p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 12 }}>
          Runs the indexer across all books-eligible wallets in the registry. Processes sequentially.
          Cap max_wallets to stay within Vercel function timeout.
        </p>
        <form onSubmit={indexAll}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tx limit per wallet</label>
              <input type="number" min={10} max={500} value={allForm.limit}
                onChange={(e) => setAllForm((f) => ({ ...f, limit: e.target.value }))}
                className={styles.formInput} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Max wallets (≤100)</label>
              <input type="number" min={1} max={100} value={allForm.max_wallets}
                onChange={(e) => setAllForm((f) => ({ ...f, max_wallets: e.target.value }))}
                className={styles.formInput} />
            </div>
          </div>
          <button type="submit" disabled={allLoading}
            style={{ marginTop: 8, padding: "6px 16px", borderRadius: 7, border: "1px solid rgba(109,184,116,0.3)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, cursor: allLoading ? "not-allowed" : "pointer", opacity: allLoading ? 0.6 : 1 }}>
            {allLoading ? "Running… (may take 30–60s)" : "Index All →"}
          </button>
        </form>

        {allError && <div className={styles.errorBox} style={{ marginTop: 10 }}>{allError}</div>}

        {allResult && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { label: "Wallets found",   value: allResult.wallets_found },
                { label: "Indexed",         value: allResult.wallets_indexed },
                { label: "Skipped",         value: allResult.wallets_skipped },
                { label: "Total txs",       value: allResult.totals.txs_fetched },
                { label: "Total events",    value: allResult.totals.events_classified },
                { label: "Evidence upgs",   value: allResult.totals.evidence_upgrades },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 600 }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{value}</p>
                </div>
              ))}
            </div>

            {allResult.truncated && (
              <p style={{ fontSize: "0.75rem", color: "#f59e0b", marginBottom: 8 }}>
                ⚠ Truncated at {allResult.truncated_at} wallets. Run again with a higher max_wallets or different offset.
              </p>
            )}

            {(allResult.per_wallet ?? []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 380, overflowY: "auto" }}>
                {allResult.per_wallet.map((w, i) => (
                  <div key={i} style={{ padding: "9px 12px", background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: w.skipped ? "#f59e0b" : "var(--ink)" }}>
                        {w.agent_slug}
                      </span>
                      <code style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                        {w.address.slice(0, 10)}…{w.address.slice(-6)}
                      </code>
                      <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{w.chain}</span>
                      {!w.skipped && (
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                          {w.txs_fetched} txs · {w.events_classified} events · {w.provider_used}
                        </span>
                      )}
                      {w.evidence_upgrade && (
                        <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 700, background: "var(--accent-soft)", color: "var(--accent)" }}>
                          → {w.evidence_upgrade}
                        </span>
                      )}
                      {w.skipped && (
                        <span style={{ fontSize: "0.68rem", color: "#f59e0b" }}>skipped: {w.skip_reason}</span>
                      )}
                      {w.fetch_error && !w.skipped && (
                        <span style={{ fontSize: "0.65rem", color: "#f59e0b" }}>⚠ fallback used</span>
                      )}
                    </div>
                    {!w.skipped && Object.keys(w.classified_counts).length > 0 && (
                      <ClassifiedCountBadges counts={w.classified_counts} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pending Updates section ───────────────────────────────────────────────────

function PendingUpdatesSection({ secret }: { secret: string }) {
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing]   = useState<string | null>(null);

  const UPDATE_TYPE_COLORS: Record<string, string> = {
    new_agent: "#22c55e", score_update: "#3b82f6", wallet_update: "#f59e0b", status_change: "#a855f7",
  };
  const UPDATE_TYPE_LABELS: Record<string, string> = {
    new_agent: "New Agent", score_update: "Score Update", wallet_update: "Wallet Update", status_change: "Status Change",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/registry/pending", { headers: { Authorization: `Bearer ${secret}` } });
      const d = await res.json() as { ok: boolean; updates?: PendingUpdate[] };
      if (d.ok) setUpdates(d.updates ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    await fetch("/api/registry/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ id, action }),
    });
    setActing(null);
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Registry</p>
        <h1>Pending Updates</h1>
        <p>Luca-queued registry changes waiting for human review.</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{updates.length} pending</span>
        <button type="button" onClick={load} disabled={loading} className={styles.navItem} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>
      {updates.length === 0 && !loading && (
        <div className={styles.stateBox}>No pending updates from Luca.</div>
      )}
      {updates.map((u) => {
        const color = UPDATE_TYPE_COLORS[u.update_type] ?? "#888";
        return (
          <div key={u.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: "0.9rem" }}>{u.agent_name}</strong>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${color}22`, color }}>
                {UPDATE_TYPE_LABELS[u.update_type] ?? u.update_type}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: "auto" }}>
                {new Date(u.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {u.diff_summary && <p style={{ fontSize: "0.83rem", marginBottom: 8 }}>{u.diff_summary}</p>}
            {u.luca_notes && (
              <div style={{ background: "var(--surface-soft)", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 12px", marginBottom: 10, fontSize: "0.83rem" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Luca&apos;s notes · </span>{u.luca_notes}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="button" onClick={() => act(u.id, "approve")} disabled={acting === u.id}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", opacity: acting === u.id ? 0.5 : 1 }}>
                Approve
              </button>
              <button type="button" onClick={() => act(u.id, "reject")} disabled={acting === u.id}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", opacity: acting === u.id ? 0.5 : 1 }}>
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Attribution Health section ─────────────────────────────────────────────────

const ATTR_STATUS_META: Record<ManifestStatus, { label: string; color: string }> = {
  manifest: { label: "Manifest",     color: "#22c55e" },
  admin:    { label: "Admin",        color: "#6DB874" },
  inferred: { label: "Inferred",     color: "#f59e0b" },
  none:     { label: "Unattributed", color: "#6b7280" },
};

const ATTR_CONF_META: Record<AttributionConfidence, { label: string; color: string }> = {
  high:         { label: "High",         color: "#22c55e" },
  medium:       { label: "Medium",       color: "#f59e0b" },
  low:          { label: "Low",          color: "#ef4444" },
  unattributed: { label: "–",            color: "#6b7280" },
};

type AttrSortKey = "name" | "status" | "wallets" | "confidence";

function attrSortAgents(agents: AgentAttributionHealth[], key: AttrSortKey, dir: 1 | -1) {
  const SR: Record<ManifestStatus, number> = { manifest: 0, admin: 1, inferred: 2, none: 3 };
  const CR: Record<AttributionConfidence, number> = { high: 0, medium: 1, low: 2, unattributed: 3 };
  return [...agents].sort((a, b) => {
    let cmp = 0;
    if (key === "name")       cmp = a.name.localeCompare(b.name);
    if (key === "status")     cmp = SR[a.manifest_status] - SR[b.manifest_status];
    if (key === "wallets")    cmp = b.wallet_count - a.wallet_count;
    if (key === "confidence") cmp = CR[a.confidence] - CR[b.confidence];
    return cmp * dir;
  });
}

function getAttrBadge(agent: AgentAttributionHealth) {
  if (agent.attribution_tier === "manifest_attributed") return { label: "Books Eligible", color: "#22c55e" };
  if (agent.manifest_status === "manifest") return { label: "Manifest Invalid", color: "#ef4444" };
  if (agent.attribution_tier === "discovered") return { label: "Discovered", color: "#f59e0b" };
  return { label: "Unattributed", color: "#6b7280" };
}

function AttributionHealthSection() {
  const [metrics, setMetrics] = useState<AttributionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [sort, setSort]       = useState<AttrSortKey>("status");
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

  const visible = metrics
    ? attrSortAgents(
        metrics.agents.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase())),
        sort, sortDir,
      )
    : [];

  const SBtn = ({ k, label }: { k: AttrSortKey; label: string }) => (
    <button onClick={() => { if (sort === k) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSort(k); setSortDir(1); } }}
      style={{ background: "none", border: "none", cursor: "pointer", fontWeight: sort === k ? 700 : 400, color: sort === k ? "var(--ink)" : "var(--muted)", fontSize: 11, padding: "0 4px" }}>
      {label} {sort === k && (sortDir === 1 ? "↑" : "↓")}
    </button>
  );

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Data Integrity</p>
        <h1>Attribution Health</h1>
        <p>Wallet attribution status across all indexed agents.</p>
      </div>
      {loading && <div className={styles.stateBox}>Loading…</div>}
      {error   && <div className={styles.errorBox}>{error}</div>}
      {metrics && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Indexed",         value: metrics.total_agents,               color: "var(--ink)" },
              { label: "Attributed",      value: metrics.manifest_attributed_agents, color: "#22c55e" },
              { label: "Discovered",      value: metrics.discovered_agents,          color: "#f59e0b" },
              { label: "Unattributed",    value: metrics.unattributed_agents,        color: "#6b7280" },
              { label: "Coverage",        value: `${metrics.attribution_coverage_pct}%`, color: "#6DB874" },
              { label: "Books-eligible",  value: metrics.books_eligible_wallets,     color: "#22c55e" },
              { label: "Contract wallets",value: metrics.contract_wallets,           color: "#ef4444" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", minWidth: 100 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents…"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 200 }} />
            <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>{visible.length} agents</span>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}><SBtn k="name" label="Agent" /></th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}><SBtn k="status" label="Status" /></th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}><SBtn k="wallets" label="Wallets" /></th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}><SBtn k="confidence" label="Confidence" /></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((agent, i) => {
                  const badge = getAttrBadge(agent);
                  const cMeta = ATTR_CONF_META[agent.confidence];
                  return (
                    <tr key={agent.slug} style={{ borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : "none", background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <Link href={`/registry/${agent.slug}`} target="_blank" rel="noopener" style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", textDecoration: "none" }}>
                          {agent.name}
                        </Link>
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{agent.ecosystem}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${badge.color}18`, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                        {agent.wallet_count > 0 ? (
                          <>
                            {agent.wallet_count}
                            {agent.books_eligible_wallet_count > 0 && <span style={{ fontSize: 10, color: "#22c55e", marginLeft: 4 }}>({agent.books_eligible_wallet_count} eligible)</span>}
                          </>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${cMeta.color}18`, color: cMeta.color }}>{cMeta.label}</span>
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
  );
}

// ── Address Classification section ────────────────────────────────────────────

const ADDR_TYPE_META: Record<string, { label: string; color: string }> = {
  eoa:               { label: "EOA",               color: "#22c55e" },
  token_contract:    { label: "Token Contract",    color: "#ef4444" },
  proxy_contract:    { label: "Proxy Contract",    color: "#8b5cf6" },
  treasury_contract: { label: "Treasury Contract", color: "#6DB874" },
  vault:             { label: "Vault",             color: "#5B8FA8" },
  smart_contract:    { label: "Smart Contract",    color: "#f59e0b" },
  smart_account:     { label: "Smart Account",     color: "#3b82f6" },
  unknown:           { label: "Unknown",           color: "#6b7280" },
};

type AddrClassificationReport = {
  ok: boolean;
  write?: { rows_updated: number; error: string | null } | null;
  summary: {
    total_agents: number; attributed_agents: number; discovered_only_agents: number; unattributed_agents: number;
    attribution_coverage_pct: number; total_addresses: number; eoa_count: number; token_contract_count: number;
    proxy_contract_count: number; treasury_contract_count: number; vault_count: number; smart_contract_count: number;
    unknown_count: number; valid_for_books_count: number; critical_issues_count: number;
  };
  critical_issues: string[];
  agents: Array<{
    name: string; slug: string; ecosystem: string; token_address: string | null;
    wallets: Array<{
      address: string; label: string; role: string | null; chain: string | null;
      evidence_source: string | null; address_type: AddressType; attribution: string; is_valid_for_books: boolean;
    }>;
    manifest_wallet_count: number; discovered_wallet_count: number; eoa_count: number;
    contract_count: number; token_contract_count: number;
    attribution_status: "attributed" | "discovered_only" | "unattributed";
  }>;
  error?: string;
};

function AddressClassificationSection({ secret }: { secret: string }) {
  const [loading, setLoading]   = useState(false);
  const [writing, setWriting]   = useState(false);
  const [report, setReport]     = useState<AddrClassificationReport | null>(null);
  const [writeMsg, setWriteMsg] = useState("");
  const [error, setError]       = useState("");

  async function runAudit(write = false) {
    if (write) { setWriting(true); } else { setLoading(true); }
    setError(""); setWriteMsg("");
    try {
      const res = await fetch(`/api/admin/address-classification${write ? "?write=true" : ""}`, {
        headers: { "x-internal-secret": secret },
      });
      const json = await res.json() as AddrClassificationReport;
      if (!json.ok) { setError(json.error ?? "Failed"); return; }
      setReport(json);
      if (write && json.write) {
        setWriteMsg(json.write.error ? `Error: ${json.write.error}` : `Wrote ${json.write.rows_updated} rows to DB`);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); setWriting(false); }
  }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Data Integrity</p>
        <h1>Address Classification</h1>
        <p>Classify wallet addresses via Alchemy and write address_type to DB.</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button type="button" onClick={() => runAudit(false)} disabled={loading || writing}
          style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Classifying…" : "Run Classification"}
        </button>
        <button type="button" onClick={() => runAudit(true)} disabled={loading || writing}
          style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: writing ? 0.6 : 1 }}>
          {writing ? "Writing…" : "Classify & Write to DB"}
        </button>
      </div>
      {writeMsg && (
        <div style={{ background: writeMsg.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${writeMsg.startsWith("Error") ? "#ef4444" : "#22c55e"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: writeMsg.startsWith("Error") ? "#ef4444" : "#22c55e" }}>
          {writeMsg}
        </div>
      )}
      {error && <div className={styles.errorBox}>{error}</div>}
      {report && (
        <>
          {report.critical_issues.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 8 }}>Critical Issues ({report.critical_issues.length})</div>
              {report.critical_issues.map((issue, i) => <div key={i} style={{ fontSize: 13, color: "#ef4444", marginBottom: 4 }}>• {issue}</div>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Total Agents",    value: report.summary.total_agents },
              { label: "Attributed",      value: report.summary.attributed_agents },
              { label: "Discovered Only", value: report.summary.discovered_only_agents },
              { label: "Unattributed",    value: report.summary.unattributed_agents },
              { label: "Coverage",        value: `${report.summary.attribution_coverage_pct}%` },
              { label: "Total Addresses", value: report.summary.total_addresses },
              { label: "EOA",             value: report.summary.eoa_count },
              { label: "Token Contracts", value: report.summary.token_contract_count },
              { label: "Books-eligible",  value: report.summary.valid_for_books_count },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr><th>Agent</th><th>Status</th><th>Wallets</th><th>EOA</th><th>Contracts</th></tr>
              </thead>
              <tbody>
                {report.agents.filter((a) => a.wallets.length > 0).map((a) => (
                  <tr key={a.slug}>
                    <td>
                      <Link href={`/registry/${a.slug}`} target="_blank" rel="noopener" style={{ color: "var(--accent)", textDecoration: "none" }}>{a.name}</Link>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                        background: a.attribution_status === "attributed" ? "#22c55e18" : a.attribution_status === "discovered_only" ? "#f59e0b18" : "#6b728018",
                        color: a.attribution_status === "attributed" ? "#22c55e" : a.attribution_status === "discovered_only" ? "#f59e0b" : "#6b7280" }}>
                        {a.attribution_status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{a.wallets.length}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: a.eoa_count > 0 ? "#22c55e" : "var(--muted)" }}>{a.eoa_count}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: a.contract_count > 0 ? "#ef4444" : "var(--muted)" }}>{a.contract_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── ERC-8004 Ingestion section ─────────────────────────────────────────────────

type Erc8004AgentResult = {
  agent_id: string; name: string; status: "upserted" | "skipped" | "error";
  has_did: boolean; wallet_address: string | null; wallet_type: string | null;
  manifest_uri: string | null; books_eligible: boolean; warnings: string[]; error?: string;
};
type Erc8004Summary = {
  total_discovered: number; metadata_coverage_pct: number; did_coverage_pct: number;
  manifest_coverage_pct: number; books_coverage_pct: number;
  agents_upserted: number; agents_skipped: number; errors: number;
};
type Erc8004Report = { ok: boolean; dry_run: boolean; summary: Erc8004Summary; agents: Erc8004AgentResult[]; generated_at: string; error?: string };

function Erc8004Section({ secret }: { secret: string }) {
  const [mode, setMode]           = useState<"contract" | "batch">("contract");
  const [fromBlock, setFromBlock] = useState("0xE4E1C0");
  const [agentIdsText, setAgentIdsText] = useState("");
  const [dryRun, setDryRun]       = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [report, setReport]       = useState<Erc8004Report | null>(null);

  async function run() {
    setLoading(true); setError(""); setReport(null);
    const body: Record<string, unknown> = { mode, dryRun };
    if (mode === "contract") body.fromBlock = fromBlock || "0xE4E1C0";
    else body.agentIds = agentIdsText.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/admin/ingest-erc8004", {
        method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as Erc8004Report;
      if (!json.ok) { setError(json.error ?? "Ingestion failed"); return; }
      setReport(json);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const ERC_STATUS_COLOR: Record<string, string> = { upserted: "#22c55e", skipped: "#f59e0b", error: "#ef4444" };

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Data Integrity</p>
        <h1>ERC-8004 Ingestion</h1>
        <p>Scan the on-chain ERC-8004 registry and sync agent metadata to Zetta.</p>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["contract", "batch"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)", background: mode === m ? "#6DB874" : "var(--bg)", color: mode === m ? "#fff" : "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {m === "contract" ? "All Agents (contract scan)" : "Batch (specific IDs)"}
            </button>
          ))}
        </div>
        {mode === "contract" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>From Block (hex)</div>
            <input value={fromBlock} onChange={(e) => setFromBlock(e.target.value)} placeholder="0xE4E1C0"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 200, fontFamily: "var(--font-mono)" }} />
          </div>
        )}
        {mode === "batch" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Agent IDs (one per line or comma-separated)</div>
            <textarea value={agentIdsText} onChange={(e) => setAgentIdsText(e.target.value)} rows={3}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: "100%", fontFamily: "var(--font-mono)" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setDryRun((v) => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: dryRun ? "#6DB874" : "var(--line)", border: "none", cursor: "pointer", position: "relative" }}>
            <span style={{ position: "absolute", top: 3, left: dryRun ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Dry Run</span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{dryRun ? "No DB writes" : "Will write to DB"}</span>
        </div>
        <button onClick={run} disabled={loading} style={{ padding: "8px 20px", borderRadius: 6, background: "#6DB874", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Running…" : "Run Ingestion"}
        </button>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      {report && (
        <>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
            {report.dry_run && <span style={{ fontWeight: 700, color: "#f59e0b", marginRight: 8 }}>[DRY RUN]</span>}
            Generated {new Date(report.generated_at).toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Discovered", value: report.summary.total_discovered },
              { label: "Upserted",   value: report.summary.agents_upserted,  color: "#22c55e" },
              { label: "Skipped",    value: report.summary.agents_skipped,   color: "#f59e0b" },
              { label: "Errors",     value: report.summary.errors,           color: "#ef4444" },
              { label: "Metadata %", value: `${report.summary.metadata_coverage_pct}%` },
              { label: "DID %",      value: `${report.summary.did_coverage_pct}%` },
              { label: "Manifest %", value: `${report.summary.manifest_coverage_pct}%` },
              { label: "Books %",    value: `${report.summary.books_coverage_pct}%` },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: (kpi as { color?: string }).color ?? "var(--ink)", fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          {report.agents.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.dataTable}>
                <thead><tr><th>Agent ID</th><th>Name</th><th>Status</th><th>DID</th><th>Books</th><th>Warnings</th></tr></thead>
                <tbody>
                  {report.agents.map((a) => (
                    <tr key={a.agent_id}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{a.agent_id}</td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${ERC_STATUS_COLOR[a.status]}18`, color: ERC_STATUS_COLOR[a.status] }}>{a.status}</span></td>
                      <td style={{ color: a.has_did ? "#a855f7" : "var(--muted)" }}>{a.has_did ? "✓" : "—"}</td>
                      <td style={{ color: a.books_eligible ? "#22c55e" : "var(--muted)" }}>{a.books_eligible ? "Yes" : "No"}</td>
                      <td style={{ fontSize: 11, color: "var(--muted)" }}>{a.warnings.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Revenue Audit section ─────────────────────────────────────────────────────

type RATabKey = "revenue" | "quarantined" | "dex" | "bridge" | "internal";
const RA_TABS: { key: RATabKey; label: string; color: string }[] = [
  { key: "revenue",     label: "Operating Revenue", color: "#22c55e" },
  { key: "quarantined", label: "Quarantined",        color: "#f59e0b" },
  { key: "dex",         label: "DEX Excluded",       color: "#3b82f6" },
  { key: "bridge",      label: "Bridge Excluded",    color: "#8b5cf6" },
  { key: "internal",    label: "Internal Transfers", color: "#6b7280" },
];
const QUARANTINE_LABELS: Record<string, string> = {
  capital_injection: "Capital Injection", grant_program: "Grant Program",
  bridge_receipt: "Bridge Receipt", token_distribution: "Token Distribution",
  unknown_large_inflow: "Unknown Large Inflow",
};
const QUARANTINE_COLORS: Record<string, string> = {
  capital_injection: "#ef4444", grant_program: "#8b5cf6", bridge_receipt: "#3b82f6",
  token_distribution: "#f59e0b", unknown_large_inflow: "#6b7280",
};
function raFmtUsd(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}
function raFmtAddr(addr: string) { return addr?.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : (addr || "—"); }
function raFmtHash(hash: string) { return hash?.length > 10 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : (hash || "—"); }

function RaWaterfall({ audit }: { audit: AgentRevenueAudit }) {
  const s = audit.summary;
  const rows = [
    { label: "Gross inflows",                          value: s.gross_inflow_usd,           sign: null, color: "#e2e8f0" },
    { label: "− Bridge receipts excluded",             value: s.bridge_excluded_inflow_usd, sign: "−",  color: "#8b5cf6" },
    { label: "− DEX swaps excluded",                  value: s.dex_excluded_usd,           sign: "−",  color: "#3b82f6" },
    { label: "− Quarantined (cap. injections/grants)", value: s.quarantined_usd,            sign: "−",  color: "#f59e0b" },
    { label: "= Operating revenue",                   value: s.operating_revenue_usd,       sign: "=",  color: "#22c55e" },
  ];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: 13 }}>Revenue Waterfall — {audit.period}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none", background: row.sign === "=" ? "rgba(34,197,94,0.06)" : "transparent" }}>
          <span style={{ fontSize: 13, color: row.sign === "=" ? "#22c55e" : "var(--ink)" }}>{row.label}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: row.sign === "=" ? 700 : 400, color: row.color }}>{row.sign === "−" ? "−" : ""}{raFmtUsd(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function RaTxTable({ txs, tab }: { txs: AuditTx[]; tab: RATabKey }) {
  if (txs.length === 0) return <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No transactions.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
            {["Tx Hash", "Time", "Amount", "Token", "Counterparty", ...(tab === "quarantined" ? ["Reason"] : []), "Audit Reason"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txs.map((tx, i) => (
            <tr key={tx.txHash + i} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                <a href={`https://basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>{raFmtHash(tx.txHash)}</a>
              </td>
              <td style={{ padding: "8px 12px", color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(tx.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: tx.direction === "income" ? "#22c55e" : "#ef4444" }}>
                {tx.direction === "expense" ? "−" : "+"}{raFmtUsd(tx.amount_usd)}
              </td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{tx.token_symbol}</td>
              <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                <a href={`https://basescan.org/address/${tx.counterparty || tx.from}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "none" }}>{raFmtAddr(tx.counterparty || tx.from)}</a>
              </td>
              {tab === "quarantined" && (
                <td style={{ padding: "8px 12px" }}>
                  {tx.quarantine_reason ? (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: `${QUARANTINE_COLORS[tx.quarantine_reason] ?? "#888"}22`, color: QUARANTINE_COLORS[tx.quarantine_reason] ?? "#888" }}>
                      {QUARANTINE_LABELS[tx.quarantine_reason] ?? tx.quarantine_reason}
                    </span>
                  ) : "—"}
                </td>
              )}
              <td style={{ padding: "8px 12px", color: "var(--muted)", maxWidth: 300 }}>{tx.audit_reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevenueAuditSection({ secret }: { secret: string }) {
  const [slug, setSlug]       = useState("");
  const [period, setPeriod]   = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [audit, setAudit]     = useState<AgentRevenueAudit | null>(null);
  const [tab, setTab]         = useState<RATabKey>("revenue");

  const load = useCallback(async () => {
    if (!secret || !slug) return;
    setLoading(true); setError(""); setAudit(null);
    try {
      const res = await fetch(`/api/v1/agent/${encodeURIComponent(slug)}/revenue-audit?period=${period}`, {
        headers: { "x-internal-secret": secret },
      });
      const json = await res.json();
      if (!res.ok) { setError((json as { error?: string }).error ?? `HTTP ${res.status}`); return; }
      setAudit(json as AgentRevenueAudit);
      setTab("revenue");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [secret, slug, period]);

  function tabTxs(key: RATabKey): AuditTx[] {
    if (!audit) return [];
    switch (key) {
      case "revenue":     return audit.transactions.operating_revenue;
      case "quarantined": return audit.transactions.quarantined;
      case "dex":         return audit.transactions.dex_excluded;
      case "bridge":      return audit.transactions.bridge_excluded;
      case "internal":    return audit.transactions.internal_transfers;
    }
  }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Financial</p>
        <h1>Revenue Audit</h1>
        <p>Deep per-agent revenue waterfall — gross → excluded → operating.</p>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>AGENT SLUG</div>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().trim())} placeholder="e.g. bankr-bot" onKeyDown={(e) => e.key === "Enter" && load()}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, width: 180 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>PERIOD</div>
          <select value={period} onChange={(e) => setPeriod(e.target.value as "7d" | "14d" | "30d" | "90d")}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13 }}>
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <button onClick={load} disabled={loading || !secret || !slug}
          style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: loading || !slug ? "var(--line)" : "var(--accent)", color: loading || !slug ? "var(--muted)" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-end" }}>
          {loading ? "Scanning…" : "Run Audit"}
        </button>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      {loading && <div className={styles.stateBox}>Scanning on-chain transactions for {slug}… up to 30s.</div>}
      {audit && (
        <>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{audit.agent.name}</h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{audit.period} · {new Date(audit.generated_at).toLocaleString()}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Gross Inflows",     value: audit.summary.gross_inflow_usd,           color: "#e2e8f0" },
              { label: "Operating Revenue", value: audit.summary.operating_revenue_usd,      color: "#22c55e" },
              { label: "Quarantined",       value: audit.summary.quarantined_usd,            color: "#f59e0b" },
              { label: "DEX Excluded",      value: audit.summary.dex_excluded_usd,           color: "#3b82f6" },
              { label: "Bridge Excluded",   value: audit.summary.bridge_excluded_inflow_usd, color: "#8b5cf6" },
            ].map((c) => (
              <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: c.color }}>{raFmtUsd(c.value)}</div>
              </div>
            ))}
          </div>
          <RaWaterfall audit={audit} />
          {audit.aeon_diff_notes.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 8 }}>AEON Diff</div>
              {audit.aeon_diff_notes.map((note, i) => <div key={i} style={{ fontSize: 13 }}>› {note}</div>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {RA_TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid", borderColor: tab === t.key ? t.color : "var(--line)", background: tab === t.key ? `${t.color}18` : "transparent", color: tab === t.key ? t.color : "var(--muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {t.label} ({tabTxs(t.key).length})
              </button>
            ))}
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            <RaTxTable txs={tabTxs(tab)} tab={tab} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Accuracy Report section ────────────────────────────────────────────────────

type AccAgentMetrics = { quarantine_rate: number; dex_rate: number; bridge_rate: number; wallet_coverage: number; revenue_per_tx: number };
type AccAgentResult = { ok: true; audit: AgentRevenueAudit; metrics: AccAgentMetrics; flags: AuditFlag[] } | { ok: false; slug: string; error: string };
type AccBatchResponse = { ok: boolean; period: string; agent_count: number; generated_at: string; summary: { total_gross_inflows: number; total_operating_revenue: number; total_quarantined: number; high_risk_agents: string[] }; flags: { high: Array<AuditFlag & { agent: string }>; medium: Array<AuditFlag & { agent: string }> }; results: AccAgentResult[] };

const ACC_NAMED_SLUGS = ["luca", "bankr", "virtuals-protocol"];

function accFmtUsd(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function AccuracyReportSection({ secret }: { secret: string }) {
  const [period, setPeriod]       = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [targetAll, setTargetAll] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [report, setReport]       = useState<AccBatchResponse | null>(null);

  const run = useCallback(async () => {
    setLoading(true); setError(""); setReport(null);
    const body = { period, slugs: targetAll ? null : ACC_NAMED_SLUGS };
    try {
      const res = await fetch("/api/admin/revenue-audit", {
        method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as AccBatchResponse;
      if (!json.ok) { setError("Report failed"); return; }
      setReport(json);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [secret, period, targetAll]);

  function sevColor(s: AuditFlag["severity"]) { return s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#6b7280"; }

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Financial</p>
        <h1>Accuracy Report</h1>
        <p>Batch revenue audit with anomaly detection and confidence flags.</p>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>PERIOD</div>
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13 }}>
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", alignSelf: "flex-end", paddingBottom: 7 }}>
          <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} />
          All agents (up to 20)
        </label>
        <button onClick={run} disabled={loading}
          style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: loading ? "var(--line)" : "var(--accent)", color: loading ? "var(--muted)" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", alignSelf: "flex-end" }}>
          {loading ? "Running…" : "Run Audit"}
        </button>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      {loading && <div className={styles.stateBox}>Running batch audit… this may take 1–2 minutes.</div>}
      {report && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Agents Audited",          value: report.agent_count.toString(),                    color: "var(--ink)" },
              { label: "Total Gross Inflows",     value: accFmtUsd(report.summary.total_gross_inflows),    color: "#e2e8f0" },
              { label: "Total Operating Revenue", value: accFmtUsd(report.summary.total_operating_revenue),color: "#22c55e" },
              { label: "Total Quarantined",       value: accFmtUsd(report.summary.total_quarantined),      color: "#f59e0b" },
              { label: "High-Risk Agents",        value: report.summary.high_risk_agents.length.toString(),color: "#ef4444" },
            ].map((c) => (
              <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          {(report.flags.high.length > 0 || report.flags.medium.length > 0) && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Flags</div>
              {[...report.flags.high, ...report.flags.medium].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${sevColor(f.severity)}22`, color: sevColor(f.severity), flexShrink: 0 }}>{f.severity}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.agent} — {f.code}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{f.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Agent</th><th>Gross</th><th>Operating Rev</th><th>Quarantined</th><th>Flags</th></tr></thead>
              <tbody>
                {report.results.map((r, i) => {
                  if (!r.ok) return <tr key={i}><td colSpan={5} style={{ color: "#ef4444", fontSize: 12 }}>{r.slug}: {r.error}</td></tr>;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.audit.agent.name}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{accFmtUsd(r.audit.summary.gross_inflow_usd)}</td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "#22c55e" }}>{accFmtUsd(r.audit.summary.operating_revenue_usd)}</td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "#f59e0b" }}>{accFmtUsd(r.audit.summary.quarantined_usd)}</td>
                      <td style={{ fontSize: 12 }}>
                        {r.flags.length > 0 ? (
                          <span style={{ color: r.flags.some((f) => f.severity === "high") ? "#ef4444" : "#f59e0b" }}>{r.flags.length} flag{r.flags.length !== 1 ? "s" : ""}</span>
                        ) : <span style={{ color: "#22c55e" }}>Clean</span>}
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
  );
}

// ── Confidence Labels section ─────────────────────────────────────────────────

type ConfAgentRow = { slug: string; name: string; label: AgentConfidenceLabel | null };
const CONF_PRIORITY_AGENTS: { slug: string; name: string }[] = [
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
const CONF_LEVELS: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: "high",         label: "High Confidence",          color: "#22c55e" },
  { value: "medium",       label: "Medium Confidence",        color: "#f59e0b" },
  { value: "low",          label: "Low Confidence",           color: "#ef4444" },
  { value: "under_review", label: "Attribution Under Review", color: "#6b7280" },
];

function ConfAgentCard({ row, secret, onSaved }: { row: ConfAgentRow; secret: string; onSaved: () => void }) {
  const [level,        setLevel]        = useState<ConfidenceLevel | "">(row.label?.confidence_level ?? "");
  const [publicNote,   setPublicNote]   = useState(row.label?.public_note ?? "");
  const [internalNote, setInternalNote] = useState(row.label?.internal_reason ?? "");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState("");

  async function save() {
    if (!level) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/admin/confidence-label", {
        method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify({ slug: row.slug, level, public_note: publicNote || undefined, internal_reason: internalNote || undefined, reviewed_by: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) { setError((json as { error?: string }).error ?? "Error"); return; }
      setSaved(true); onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const currentMeta = row.label ? CONFIDENCE_META[row.label.confidence_level] : null;
  const meta = level ? CONFIDENCE_META[level] : null;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href={`/registry/${row.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", textDecoration: "none" }}>{row.name}</Link>
        {currentMeta && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${currentMeta.color}22`, color: currentMeta.color }}>{currentMeta.label}</span>}
        {!row.label && <span style={{ fontSize: 11, color: "var(--muted)" }}>not yet labeled</span>}
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CONF_LEVELS.map((l) => (
            <button key={l.value} onClick={() => setLevel(l.value)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid", borderColor: level === l.value ? l.color : "var(--line)", background: level === l.value ? `${l.color}18` : "transparent", color: level === l.value ? l.color : "var(--muted)", cursor: "pointer" }}>
              {l.label}
            </button>
          ))}
        </div>
        <textarea value={publicNote} onChange={(e) => setPublicNote(e.target.value)} placeholder="Public note (shown on profile)" rows={2}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
        <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Internal reason (admin only)" rows={2}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
        {error && <div style={{ fontSize: 12, color: "#ef4444" }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={save} disabled={saving || !level} style={{ padding: "7px 18px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, background: saving || !level ? "var(--line)" : (meta?.color ?? "var(--accent)"), color: saving || !level ? "var(--muted)" : "#fff", cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Label"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "#22c55e" }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}

function ConfidenceLabelsSection({ secret }: { secret: string }) {
  const [rows, setRows]       = useState<ConfAgentRow[]>(CONF_PRIORITY_AGENTS.map((a) => ({ ...a, label: null })));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const loadLabels = useCallback(async () => {
    if (!secret) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/confidence-label", { headers: { "x-internal-secret": secret } });
      const json = await res.json() as { labels?: AgentConfidenceLabel[]; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setRows(CONF_PRIORITY_AGENTS.map((a) => ({ ...a, label: (json.labels ?? []).find((l) => l.agent_slug === a.slug) ?? null })));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [secret]);

  useEffect(() => { loadLabels(); }, [loadLabels]);

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Financial</p>
        <h1>Confidence Labels</h1>
        <p>Set public revenue attribution confidence levels — appear on agent profiles immediately.</p>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      {loading && <div className={styles.stateBox}>Loading labels…</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row) => (
          <ConfAgentCard key={row.slug} row={row} secret={secret} onSaved={loadLabels} />
        ))}
      </div>
    </div>
  );
}

// ── B20 Intelligence section ───────────────────────────────────────────────────

type B20TokenResult = { address: string; name: string | null; symbol: string | null; linked_agent: string | null; link_confidence: string; manifest_status: string; activity_events_inserted: number; status: "indexed" | "skipped" | "error"; error?: string };
type B20IndexReport = { ok: boolean; dry_run: boolean; summary: { tokens_discovered: number; tokens_indexed: number; errors: number; attributed: number; candidates: number; awaiting_manifest: number; data_integrity_note: string }; tokens: B20TokenResult[]; generated_at: string; error?: string };
type B20DetectResult = { address: string; agent_name: string; passes_prefix: boolean; confirmed_on_chain: boolean; name: string | null; symbol: string | null; recommendation: string };
type B20DetectReport = { ok: boolean; total_with_token_address: number; b20_prefix_matches: number; confirmed_b20: number; results: B20DetectResult[]; non_b20_addresses: { agent_name: string; address: string }[]; note: string; generated_at: string; error?: string };

type B20Report = B20IndexReport | B20DetectReport;

function B20Section({ secret }: { secret: string }) {
  const [mode, setMode]       = useState<"detect_from_registry" | "from_registry" | "single" | "activity_only">("detect_from_registry");
  const [chain, setChain]     = useState<"base" | "base-sepolia">("base");
  const [dryRun, setDryRun]   = useState(true);
  const [singleAddr, setSingleAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [report, setReport]   = useState<B20Report | null>(null);

  async function run() {
    setLoading(true); setError(""); setReport(null);
    const body: Record<string, unknown> = { mode, chain, dryRun };
    if (mode === "single") body.tokenAddress = singleAddr;
    try {
      const res = await fetch("/api/admin/index-b20", {
        method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": secret },
        body: JSON.stringify(body),
      });
      const json = await res.json() as B20Report;
      if (!json.ok) { setError((json as { error?: string }).error ?? "Failed"); return; }
      setReport(json);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const isDetect = mode === "detect_from_registry";
  const isIndex  = !isDetect && report && "summary" in report;

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Growth OS</p>
        <h1>B20 Intelligence</h1>
        <p>Detect and index B20 token contracts linked to registry agents.</p>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {(["detect_from_registry", "from_registry", "single", "activity_only"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid", borderColor: mode === m ? "#6DB874" : "var(--line)", background: mode === m ? "#6DB87418" : "transparent", color: mode === m ? "#6DB874" : "var(--ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {m.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["base", "base-sepolia"] as const).map((c) => (
            <button key={c} onClick={() => setChain(c)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid", borderColor: chain === c ? "#5B8FA8" : "var(--line)", background: chain === c ? "#5B8FA818" : "transparent", color: chain === c ? "#5B8FA8" : "var(--muted)", fontSize: 12, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
        {mode === "single" && (
          <div style={{ marginBottom: 14 }}>
            <input value={singleAddr} onChange={(e) => setSingleAddr(e.target.value)} placeholder="Token address (0x…)"
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, width: 340, fontFamily: "var(--font-mono)" }} />
          </div>
        )}
        {!isDetect && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setDryRun((v) => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: dryRun ? "#6DB874" : "var(--line)", border: "none", cursor: "pointer", position: "relative" }}>
              <span style={{ position: "absolute", top: 3, left: dryRun ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Dry Run</span>
          </div>
        )}
        <button onClick={run} disabled={loading} style={{ padding: "8px 20px", borderRadius: 6, background: "#6DB874", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Running…" : "Run"}
        </button>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      {report && isDetect && "results" in report && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "With Token Address", value: (report as B20DetectReport).total_with_token_address },
              { label: "B20 Prefix Matches", value: (report as B20DetectReport).b20_prefix_matches },
              { label: "Confirmed B20",      value: (report as B20DetectReport).confirmed_b20 },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Agent</th><th>Token Address</th><th>Symbol</th><th>Confirmed</th><th>Recommendation</th></tr></thead>
              <tbody>
                {(report as B20DetectReport).results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.agent_name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{r.address.slice(0, 10)}…</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.symbol ?? "—"}</td>
                    <td style={{ color: r.confirmed_on_chain ? "#22c55e" : "#ef4444" }}>{r.confirmed_on_chain ? "Yes" : "No"}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{r.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {report && isIndex && "summary" in report && (
        <>
          {(report as B20IndexReport).dry_run && <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 8 }}>[DRY RUN]</div>}
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
            ⚠ {(report as B20IndexReport).summary.data_integrity_note}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Discovered", value: (report as B20IndexReport).summary.tokens_discovered },
              { label: "Indexed",    value: (report as B20IndexReport).summary.tokens_indexed },
              { label: "Attributed", value: (report as B20IndexReport).summary.attributed },
              { label: "Candidates", value: (report as B20IndexReport).summary.candidates },
              { label: "Errors",     value: (report as B20IndexReport).summary.errors },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SettingsSection({ onSignOut, health }: { onSignOut: () => void; health: HealthData | null }) {
  const envStatus = [
    { key: "ZETTA_INTERNAL_SECRET", ok: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY",  ok: health?.services.supabase ?? null },
    { key: "ALCHEMY_API_KEY",            ok: health?.services.alchemy  ?? null },
    { key: "OPENAI_API_KEY",             ok: health?.services.openai   ?? null },
    { key: "TELEGRAM_BOT_TOKEN",         ok: true },
    { key: "SURPLUS_API_KEY",            ok: true },
    { key: "LUCA_ADMIN_CHAT_ID",         ok: null },
  ];

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>System</p>
        <h1>Settings</h1>
        <p>Policies, environment, and session management.</p>
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Operating Policy</p>
          <ul className={styles.policyList}>
            {POLICIES.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Environment {health && `· v${health.stage}`}</p>
          <div className={styles.envList}>
            {envStatus.map(({ key, ok }) => (
              <div key={key} className={styles.envRow}>
                <code>{key}</code>
                {ok === null
                  ? <span style={{ color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700 }}>● unknown</span>
                  : ok
                  ? <span className={styles.envSet}>● set</span>
                  : <span style={{ color: "#ef4444", fontSize: "0.72rem", fontWeight: 700 }}>● missing</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
      <button type="button" onClick={onSignOut} className={styles.signOutBtn}>
        Sign out of admin
      </button>
    </div>
  );
}

// ── Subagent Runs ─────────────────────────────────────────────────────────────

const RUN_STATUS_COLOR: Record<string, string> = {
  running: "var(--blue)",
  success: "var(--accent)",
  failed:  "#f87171",
  timeout: "#f59e0b",
};

function fmtDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SubagentRunsSection({ secret }: { secret: string }) {
  const [runs, setRuns]     = useState<SubagentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "failed" | "running">("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/subagent-runs", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; runs?: SubagentRun[] }) => { setRuns(d.runs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [secret]);

  const visible = filter === "all" ? runs : runs.filter((r) => r.status === filter);

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Luca Intelligence</p>
        <h2>Subagent Runs</h2>
        <p>Live log of every Hermes skill execution — name, status, duration, and result.</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
        {(["all", "running", "success", "failed"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{
            padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", cursor: "pointer",
            background: filter === f ? "var(--accent)" : "var(--surface)",
            color: filter === f ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 600,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--muted)" }}>
          {visible.length} run{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className={styles.stateBox}>Loading runs…</div>
      ) : visible.length === 0 ? (
        <div className={styles.stateBox}>No runs yet. Hermes will log here when skills execute.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {visible.map((run) => (
            <div key={run.id} className={styles.card} style={{ padding: "11px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: RUN_STATUS_COLOR[run.status] ?? "var(--muted)",
                  boxShadow: run.status === "running" ? `0 0 6px ${RUN_STATUS_COLOR.running}` : undefined,
                }} />
                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)", flex: 1 }}>
                  {run.subagent_name}
                </span>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                  border: "1px solid var(--line)", textTransform: "capitalize",
                  color: RUN_STATUS_COLOR[run.status] ?? "var(--muted)",
                }}>
                  {run.status}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>
                  {fmtDuration(run.duration_ms)}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>
                  {new Date(run.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {run.summary && (
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "6px 0 0", paddingLeft: 18 }}>
                  {run.summary}
                </p>
              )}
              {run.error && (
                <p style={{ fontSize: "0.75rem", color: "#f87171", margin: "4px 0 0", paddingLeft: 18, fontFamily: "monospace" }}>
                  {run.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pending Replies ───────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  low:    "var(--accent)",
  medium: "#f59e0b",
  high:   "#f87171",
};

const STATUS_BG: Record<string, string> = {
  approved: "var(--accent)",
  rejected: "#f87171",
  posted:   "#22c55e",
};

function PendingRepliesSection({ secret }: { secret: string }) {
  const [replies, setReplies]       = useState<PendingReply[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"pending" | "approved" | "all">("pending");
  const [notes, setNotes]           = useState<Record<string, string>>({});
  const [editedDrafts, setEdited]   = useState<Record<string, string>>({});
  const [acting, setActing]         = useState<string | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/pending-replies?status=${filter}`, { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json())
      .then((d: { ok: boolean; replies?: PendingReply[] }) => { setReplies(d.replies ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [secret, filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "post") {
    setActing(id);
    await fetch(`/api/admin/pending-replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        action,
        reviewer_notes: notes[id] ?? null,
        edited_reply:   editedDrafts[id] ?? null,
      }),
    });
    setActing(null);
    load();
  }

  function copyReply(id: string, draft: string) {
    const text = editedDrafts[id] ?? draft;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    }).catch(() => {});
  }

  const pendingCount = replies.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Luca Intelligence</p>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          X Reply Queue
          {pendingCount > 0 && (
            <span style={{ fontSize: "0.6em", background: "#f87171", color: "#fff", borderRadius: 99, padding: "2px 8px" }}>
              {pendingCount}
            </span>
          )}
        </h2>
        <p>Luca drafts replies here. Edit, copy to X manually, then mark as posted. Nothing auto-posts.</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["pending", "approved", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{
            padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", cursor: "pointer",
            background: filter === f ? "var(--accent)" : "var(--surface)",
            color: filter === f ? "#fff" : "var(--muted)", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
          }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.stateBox}>Loading replies…</div>
      ) : replies.length === 0 ? (
        <div className={styles.stateBox}>
          {filter === "pending"
            ? "No pending replies. Luca will queue drafts here before anything posts publicly."
            : filter === "approved"
            ? "No approved replies awaiting posting."
            : "No replies logged yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {replies.map((reply) => {
            const draftText  = editedDrafts[reply.id] ?? reply.draft_reply;
            const isEdited   = editedDrafts[reply.id] !== undefined && editedDrafts[reply.id] !== reply.draft_reply;
            const isPending  = reply.status === "pending";
            const isApproved = reply.status === "approved";

            return (
              <div key={reply.id} className={styles.card} style={{ padding: "14px 16px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {reply.target_user && (
                    <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)" }}>
                      @{reply.target_user.replace("@", "")}
                    </span>
                  )}
                  {reply.target_post_url && (
                    <a href={reply.target_post_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: "0.72rem", color: "var(--blue)", textDecoration: "none" }}>
                      View post ↗
                    </a>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: "0.68rem", fontWeight: 600,
                    padding: "2px 7px", borderRadius: 99, border: "1px solid var(--line)",
                    textTransform: "capitalize", color: RISK_COLOR[reply.risk_level],
                  }}>
                    {reply.risk_level} risk
                  </span>
                  {reply.status !== "pending" && (
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                      background: STATUS_BG[reply.status] ?? "var(--muted)",
                      color: "#fff", textTransform: "capitalize",
                    }}>
                      {reply.status}
                    </span>
                  )}
                </div>

                {/* Editable draft */}
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <textarea
                    value={draftText}
                    readOnly={!isPending && !isApproved}
                    onChange={(e) => setEdited((prev) => ({ ...prev, [reply.id]: e.target.value }))}
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "var(--surface-soft)", border: `1px solid ${isEdited ? "var(--accent)" : "var(--line)"}`,
                      borderRadius: 8, padding: "10px 12px",
                      fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.65,
                      resize: "vertical", outline: "none", fontFamily: "inherit",
                      cursor: !isPending && !isApproved ? "default" : "text",
                    }}
                  />
                  {isEdited && (
                    <span style={{ position: "absolute", top: 8, right: 10, fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600 }}>
                      edited
                    </span>
                  )}
                </div>

                {/* Copy button */}
                <div style={{ marginBottom: 10 }}>
                  <button type="button" onClick={() => copyReply(reply.id, reply.draft_reply)}
                    style={{
                      padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", cursor: "pointer",
                      background: copied === reply.id ? "#22c55e" : "var(--surface)",
                      color: copied === reply.id ? "#fff" : "var(--muted)",
                      fontSize: "0.75rem", fontWeight: 600, transition: "background 0.2s",
                    }}>
                    {copied === reply.id ? "Copied!" : "Copy Reply"}
                  </button>
                  <span style={{ marginLeft: 8, fontSize: "0.68rem", color: "var(--muted)" }}>
                    — paste this on X as @AskLucaAI
                  </span>
                </div>

                {/* Recommendation */}
                {reply.recommendation && (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 10, fontStyle: "italic" }}>
                    {reply.recommendation}
                  </p>
                )}

                {/* Approve / Reject (pending only) */}
                {isPending && (
                  <>
                    <input
                      type="text"
                      placeholder="Reviewer note (optional)…"
                      value={notes[reply.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [reply.id]: e.target.value }))}
                      style={{
                        width: "100%", padding: "6px 10px", marginBottom: 8,
                        border: "1px solid var(--line)", borderRadius: 6,
                        background: "var(--surface)", color: "var(--ink)", fontSize: "0.8rem", outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" disabled={acting === reply.id}
                        onClick={() => act(reply.id, "approve")} className={styles.actionBtn}>
                        {acting === reply.id ? "…" : "Approve"}
                      </button>
                      <button type="button" disabled={acting === reply.id}
                        onClick={() => act(reply.id, "reject")} className={styles.ghostBtn}
                        style={{ color: "#f87171", borderColor: "#f87171" }}>
                        Reject
                      </button>
                    </div>
                  </>
                )}

                {/* Mark as Posted (approved only) */}
                {isApproved && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button type="button" disabled={acting === reply.id}
                      onClick={() => act(reply.id, "post")} className={styles.actionBtn}
                      style={{ background: "#22c55e", borderColor: "#22c55e" }}>
                      {acting === reply.id ? "…" : "Mark as Posted"}
                    </button>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      Copy the reply first, then confirm you posted it on X.
                    </span>
                  </div>
                )}

                {reply.reviewer_notes && (
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8 }}>
                    Note: {reply.reviewer_notes}
                  </p>
                )}

                <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 8 }}>
                  {new Date(reply.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {reply.posted_at && (
                    <> · Posted {new Date(reply.posted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Outreach CRM Section ──────────────────────────────────────────────────────

const DM_TEMPLATES: Record<string, string> = {
  "Candidate": `Hey [name] 👋 — We've indexed [agent] in the Zetta Agent Financial Registry. Zetta gives agents a public financial identity: declared wallets, books, and leaderboard standing. Takes 5 minutes to declare a manifest. Happy to help if you have questions — just reply here.`,
  "Wallets Declared": `Hey [name] — [agent]'s wallet manifest is in and books are generating. You're now in the Zetta leaderboard. Let me know if you'd like a deeper financial summary or have questions about the data.`,
  "Awaiting Manifest": `Hey [name] — [agent] is indexed in Zetta's registry but hasn't declared a wallet manifest yet. A quick .agent/wallets.json in your repo unlocks full financial attribution, leaderboard placement, and your public agent card. Link: https://www.zettaai.co/manifest/spec`,
};

type OutreachAgent = {
  name: string;
  slug: string;
  verificationStatus: string;
  outreachStatus: string | null;
  ecosystem: string;
  xHandle: string;
  revenue_usd: number;
};

function OutreachSection({ secret }: { secret: string }) {
  const [agents, setAgents] = useState<OutreachAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/registry/agents", {
          headers: { "Authorization": `Bearer ${secret}` },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const d = await res.json() as { agents?: OutreachAgent[] };
        const candidates = (d.agents ?? []).filter((a: OutreachAgent) =>
          ["Candidate", "Awaiting Manifest", "Needs Verification"].includes(a.verificationStatus)
        );
        candidates.sort((a: OutreachAgent, b: OutreachAgent) => b.revenue_usd - a.revenue_usd);
        setAgents(candidates);
      } catch {
        setError("Could not load agent list.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [secret]);

  function generateDm(agent: OutreachAgent): string {
    const base = DM_TEMPLATES[agent.verificationStatus] ?? DM_TEMPLATES["Candidate"];
    return base
      .replace(/\[name\]/g, agent.xHandle || agent.name)
      .replace(/\[agent\]/g, agent.name);
  }

  function copyDm(agent: OutreachAgent) {
    navigator.clipboard.writeText(generateDm(agent)).then(() => {
      setCopiedSlug(agent.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  async function updateOutreachStatus(slug: string, status: string) {
    setUpdatingSlug(slug);
    try {
      const res = await fetch("/api/admin/registry/outreach-status", {
        method: "POST",
        headers: { "Authorization": `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, status }),
      });
      if (res.ok) {
        setAgents((prev) => prev.map((a) => a.slug === slug ? { ...a, outreachStatus: status } : a));
      }
    } finally {
      setUpdatingSlug(null);
    }
  }

  const statusColor: Record<string, string> = {
    "Not started": "#6b7280",
    "In progress": "#f59e0b",
    "Connected": "#6DB874",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "1.3rem", fontWeight: 700 }}>Outreach CRM</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
          Candidate agents sorted by estimated revenue. DM templates pre-generated — copy and send.
        </p>
      </div>

      {loading && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading agents…</p>}
      {error && <p style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</p>}

      {!loading && agents.length === 0 && (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          No unclaimed agents found. All agents may already have declared wallets.
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.75rem", color: "var(--muted)" }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""} awaiting outreach
          </p>
          {agents.map((a) => (
            <div key={a.slug} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, padding: "12px 16px", alignItems: "center", background: "var(--surface-soft)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <a href={`/registry/${a.slug}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)", textDecoration: "none" }}>{a.name}</a>
                    <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "var(--line)", padding: "1px 7px", borderRadius: 99 }}>{a.ecosystem}</span>
                    {a.xHandle && (
                      <a href={`https://x.com/${a.xHandle.replace("@","")}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#1d9bf0", textDecoration: "none" }}>{a.xHandle}</a>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{a.verificationStatus}</span>
                    <select
                      value={a.outreachStatus ?? "Not started"}
                      disabled={updatingSlug === a.slug}
                      onChange={(e) => updateOutreachStatus(a.slug, e.target.value)}
                      style={{
                        fontSize: "0.68rem", fontWeight: 600, padding: "2px 6px", borderRadius: 5,
                        border: "1px solid var(--line)", background: "var(--surface-soft)",
                        color: statusColor[a.outreachStatus ?? "Not started"] ?? "var(--muted)",
                        cursor: "pointer", opacity: updatingSlug === a.slug ? 0.5 : 1,
                      }}
                    >
                      <option value="Not started">Not started</option>
                      <option value="In progress">In progress</option>
                      <option value="Connected">Connected</option>
                    </select>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {a.revenue_usd > 0 ? `$${a.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} rev` : "—"}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(selectedTemplate === a.slug ? null : a.slug)}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {selectedTemplate === a.slug ? "Hide" : "View DM"}
                </button>
                <button
                  type="button"
                  onClick={() => copyDm(a)}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: copiedSlug === a.slug ? "var(--accent)" : "var(--accent-soft)", color: copiedSlug === a.slug ? "#fff" : "var(--accent)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s" }}
                >
                  {copiedSlug === a.slug ? "Copied!" : "Copy DM"}
                </button>
              </div>
              {selectedTemplate === a.slug && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
                  <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.8rem", color: "var(--ink)", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {generateDm(a)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LucaAdminPage() {
  const [authed, setAuthed]     = useState(false);
  const [secret, setSecret]     = useState("");
  const [input, setInput]       = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [section, setSection]   = useState<Section>("overview");
  const [health, setHealth]     = useState<HealthData | null>(null);
  const [pendingCount, setPendingCount]               = useState(0);
  const [pendingRepliesCount, setPendingRepliesCount] = useState(0);
  const [todayMetrics, setTodayMetrics]               = useState<DailyMetric | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("luca_admin_secret");
    if (stored) { setSecret(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/health").then((r) => r.json()).then((d) => setHealth(d as HealthData)).catch(() => {});
  }, [authed]);

  useEffect(() => {
    if (!authed || !secret) return;
    const h = { Authorization: `Bearer ${secret}` };
    fetch("/api/registry/pending", { headers: h })
      .then((r) => r.json())
      .then((d: { ok: boolean; updates?: unknown[] }) => { if (d.ok) setPendingCount(d.updates?.length ?? 0); })
      .catch(() => {});
    fetch("/api/admin/pending-replies?status=pending", { headers: h })
      .then((r) => r.json())
      .then((d: { ok: boolean; replies?: unknown[] }) => { if (d.ok) setPendingRepliesCount(d.replies?.length ?? 0); })
      .catch(() => {});
    fetch("/api/admin/growth", { headers: h })
      .then((r) => r.json())
      .then((d: { ok: boolean; today?: DailyMetric }) => { if (d.ok && d.today) setTodayMetrics(d.today); })
      .catch(() => {});
  }, [authed, secret]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      if (res.status === 401) {
        setAuthError("Wrong password.");
      } else {
        const data = await res.json() as { ok: boolean; token?: string };
        const token = data.token ?? input;
        sessionStorage.setItem("luca_admin_secret", token);
        setSecret(token);
        setAuthed(true);
      }
    } catch {
      setAuthError("Network error.");
    }
    setAuthLoading(false);
  }

  function handleSignOut() {
    sessionStorage.removeItem("luca_admin_secret");
    setSecret(""); setAuthed(false); setInput("");
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className={styles.authGate}>
        <div className={styles.authCard}>
          <div className={styles.authLogo}>L</div>
          <p className={styles.authTitle}>Luca Admin</p>
          <p className={styles.authSub}>Zetta Command Center — admin access only.</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              className={styles.authInput}
            />
            {authError && <p className={styles.authError}>{authError}</p>}
            <button type="submit" disabled={authLoading || !input} className={styles.authBtn}>
              {authLoading ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  const groups = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className={styles.adminRoot}>
      {/* Header */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/registry">Registry</Link>
          <Link href="/luca">Luca</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", padding: "3px 9px", border: "1px solid var(--line)", borderRadius: 6 }}>
            Admin
          </span>
        </div>
      </header>

      <div className={styles.adminBody}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <p className={styles.sidebarBrandName}>Luca Admin</p>
            <p className={styles.sidebarBrandSub}>Zetta</p>
          </div>

          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className={styles.navGroup}>{GROUP_LABELS[group]}</p>
              {items.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => setSection(item.section)}
                  className={section === item.section ? styles.navItemActive : styles.navItem}
                >
                  {item.label}
                  {item.section === "registry" && pendingCount > 0 && (
                    <span className={styles.navBadge}>{pendingCount}</span>
                  )}
                  {item.section === "pending-replies" && pendingRepliesCount > 0 && (
                    <span className={styles.navBadge}>{pendingRepliesCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}

          <Link href="/registry" className={styles.navItem} target="_blank" rel="noreferrer">Public Registry ↗</Link>

          <div className={styles.sidebarFooter}>
            <div className={styles.liveDot} />
            Live · VPS
          </div>
        </aside>

        {/* Workspace */}
        <main className={styles.workspace}>
          {section === "overview"  && <OverviewSection health={health} today={todayMetrics} />}
          {section === "registry"    && <RegistrySection secret={secret} />}
          {section === "attribution" && <AttributionSection secret={secret} />}
          {section === "economics"   && <EconomicsSection />}
          {section === "truth-engine" && <TruthEngineSection secret={secret} />}
          {section === "growth"    && <GrowthSection secret={secret} />}
          {section === "reports"   && <ReportsSection secret={secret} />}
          {section === "comm"      && <CommIntelSection secret={secret} />}
          {section === "outreach"  && <OutreachSection secret={secret} />}
          {section === "subagent-runs"   && <SubagentRunsSection secret={secret} />}
          {section === "pending-replies" && <PendingRepliesSection secret={secret} />}
          {section === "pending-updates"        && <PendingUpdatesSection secret={secret} />}
          {section === "attribution-health"    && <AttributionHealthSection />}
          {section === "address-classification"&& <AddressClassificationSection secret={secret} />}
          {section === "erc8004"               && <Erc8004Section secret={secret} />}
          {section === "revenue-audit"         && <RevenueAuditSection secret={secret} />}
          {section === "accuracy-report"       && <AccuracyReportSection secret={secret} />}
          {section === "confidence-labels"     && <ConfidenceLabelsSection secret={secret} />}
          {section === "b20"                   && <B20Section secret={secret} />}
          {section === "settings"              && <SettingsSection onSignOut={handleSignOut} health={health} />}
        </main>
      </div>
    </div>
  );
}
