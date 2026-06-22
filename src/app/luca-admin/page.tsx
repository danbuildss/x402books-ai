"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "registry" | "attribution" | "economics" | "growth" | "reports" | "comm" | "roadmap" | "settings" | "subagent-runs" | "pending-replies";
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

const ROADMAP = [
  {
    tag: "CLI",
    title: "Zetta CLI",
    color: "var(--blue)",
    description: "Command-line interface for wallet scanning, reporting, and registry lookups.",
    items: ["zetta scan <wallet>", "zetta report <wallet>", "zetta score <wallet>", "zetta registry lookup <query>"],
  },
  {
    tag: "SDK",
    title: "TypeScript SDK",
    color: "#a78bfa",
    description: "Typed client for building apps on top of Zetta APIs.",
    items: ["ledgerSummary(wallet)", "transactions(wallet)", "fullReport(wallet)", "agentFinancialState(wallet)"],
  },
  {
    tag: "MCP",
    title: "MCP Server",
    color: "#f59e0b",
    description: "Model Context Protocol tools so other agents can call Zetta directly.",
    items: ["scan_wallet", "generate_report", "lookup_agent", "analyze_portfolio", "check_agent_score"],
  },
];

const NAV: { section: Section; label: string; group: string }[] = [
  { section: "overview",   label: "Overview",    group: "main" },
  { section: "registry",     label: "Registry",     group: "ops" },
  { section: "attribution",  label: "Attribution",  group: "ops" },
  { section: "economics",    label: "Economics",    group: "ops" },
  { section: "growth",     label: "Growth OS",   group: "ops" },
  { section: "reports",    label: "Reports",     group: "ops" },
  { section: "comm",            label: "Comm Intel",      group: "intel" },
  { section: "subagent-runs",   label: "Subagent Runs",   group: "intel" },
  { section: "pending-replies", label: "Pending Replies", group: "intel" },
  { section: "roadmap",         label: "Roadmap",         group: "intel" },
  { section: "settings",   label: "Settings",    group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  main:   "Overview",
  ops:    "Operations",
  intel:  "Intelligence",
  system: "System",
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

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

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
            {["TELEGRAM_BOT_TOKEN", "LUCA_ADMIN_CHAT_ID", "X402BOOKS_INTERNAL_SECRET"].map((key) => (
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

function RoadmapSection() {
  return (
    <div>
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Agent Tooling</p>
        <h1>Roadmap</h1>
        <p>Planned packages that make Zetta callable by other agents and developers.</p>
      </div>
      <div className={styles.roadmapGrid}>
        {ROADMAP.map((item) => (
          <div key={item.tag} className={styles.roadmapCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className={styles.roadmapTag}
                style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}>
                {item.tag}
              </span>
              <span className={styles.roadmapStatus}>Planned</span>
            </div>
            <p className={styles.roadmapCardTitle}>{item.title}</p>
            <p className={styles.roadmapCardDesc}>{item.description}</p>
            <div className={styles.cmdList}>
              {item.items.map((cmd) => (
                <code key={cmd} className={styles.cmdItem}>{cmd}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSection({ onSignOut, health }: { onSignOut: () => void; health: HealthData | null }) {
  const envStatus = [
    { key: "X402BOOKS_INTERNAL_SECRET", ok: true },
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

          <div className={styles.navDivider} />
          <Link href="/luca-admin/registry-updates" className={styles.navItem}>Pending Updates</Link>
          <Link href="/luca-admin/revenue-accuracy-report" className={styles.navItem}>Accuracy Report</Link>
          <Link href="/luca-admin/revenue-audit" className={styles.navItem}>Revenue Audit</Link>
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
          {section === "growth"    && <GrowthSection secret={secret} />}
          {section === "reports"   && <ReportsSection secret={secret} />}
          {section === "comm"      && <CommIntelSection secret={secret} />}
          {section === "subagent-runs"   && <SubagentRunsSection secret={secret} />}
          {section === "pending-replies" && <PendingRepliesSection secret={secret} />}
          {section === "roadmap"         && <RoadmapSection />}
          {section === "settings"        && <SettingsSection onSignOut={handleSignOut} health={health} />}
        </main>
      </div>
    </div>
  );
}
