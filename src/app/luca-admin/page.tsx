"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "registry" | "economics" | "growth" | "reports" | "comm" | "roadmap" | "settings";
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
      { name: "Wallet Audit Agent", role: "Runs x402Books wallet audits", cadence: "On demand", status: "active" },
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
  "$LUCA is the unified ecosystem token powering Luca and x402Books AI.",
  "Wallets are never called official unless verified by evidence.",
];

const ROADMAP = [
  {
    tag: "CLI",
    title: "x402Books CLI",
    color: "var(--blue)",
    description: "Command-line interface for wallet scanning, reporting, and registry lookups.",
    items: ["x402books scan <wallet>", "x402books report <wallet>", "x402books score <wallet>", "x402books registry lookup <query>"],
  },
  {
    tag: "SDK",
    title: "TypeScript SDK",
    color: "#a78bfa",
    description: "Typed client for building apps on top of x402Books AI APIs.",
    items: ["ledgerSummary(wallet)", "transactions(wallet)", "fullReport(wallet)", "agentFinancialState(wallet)"],
  },
  {
    tag: "MCP",
    title: "MCP Server",
    color: "#f59e0b",
    description: "Model Context Protocol tools so other agents can call x402Books directly.",
    items: ["scan_wallet", "generate_report", "lookup_agent", "analyze_portfolio", "check_agent_score"],
  },
];

const NAV: { section: Section; label: string; group: string }[] = [
  { section: "overview",   label: "Overview",    group: "main" },
  { section: "registry",   label: "Registry",    group: "ops" },
  { section: "economics",  label: "Economics",   group: "ops" },
  { section: "growth",     label: "Growth OS",   group: "ops" },
  { section: "reports",    label: "Reports",     group: "ops" },
  { section: "comm",       label: "Comm Intel",  group: "intel" },
  { section: "roadmap",    label: "Roadmap",     group: "intel" },
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
        Repo-submitted wallet manifests via <code>.x402books/wallets.json</code>. Review and approve to upgrade agent profile.
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
        <p>Planned packages that make x402Books callable by other agents and developers.</p>
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

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LucaAdminPage() {
  const [authed, setAuthed]     = useState(false);
  const [secret, setSecret]     = useState("");
  const [input, setInput]       = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [section, setSection]   = useState<Section>("overview");
  const [health, setHealth]     = useState<HealthData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayMetrics, setTodayMetrics] = useState<DailyMetric | null>(null);

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
          <p className={styles.authSub}>x402Books Command Center — admin access only.</p>
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
            <p className={styles.sidebarBrandSub}>x402Books</p>
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
                </button>
              ))}
            </div>
          ))}

          <div className={styles.navDivider} />
          <Link href="/luca-admin/registry-updates" className={styles.navItem}>Pending Updates</Link>
          <Link href="/registry" className={styles.navItem} target="_blank" rel="noreferrer">Public Registry ↗</Link>

          <div className={styles.sidebarFooter}>
            <div className={styles.liveDot} />
            Live · VPS
          </div>
        </aside>

        {/* Workspace */}
        <main className={styles.workspace}>
          {section === "overview"  && <OverviewSection health={health} today={todayMetrics} />}
          {section === "registry"  && <RegistrySection secret={secret} />}
          {section === "economics" && <EconomicsSection />}
          {section === "growth"    && <GrowthSection secret={secret} />}
          {section === "reports"   && <ReportsSection secret={secret} />}
          {section === "comm"      && <CommIntelSection secret={secret} />}
          {section === "roadmap"   && <RoadmapSection />}
          {section === "settings"  && <SettingsSection onSignOut={handleSignOut} health={health} />}
        </main>
      </div>
    </div>
  );
}
