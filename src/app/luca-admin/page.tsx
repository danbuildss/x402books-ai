"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "registry" | "growth" | "reports" | "comm" | "roadmap" | "settings";

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

// ── Static data ───────────────────────────────────────────────────────────────

const LAYERS = [
  {
    label: "Layer 1",
    title: "Content Intelligence",
    purpose: "Research + publishing",
    tone: "blue" as const,
    agents: [
      { icon: "B", name: "Content Strategist", role: "Decides what Luca should say", cadence: "1x daily + 1x weekly", status: "active" },
      { icon: "X", name: "X Research Agent", role: "Studies agents, narratives, and public signals", cadence: "Always watching", status: "active" },
      { icon: "W", name: "Writer Agent", role: "Drafts posts, threads, and audit notes", cadence: "5 drafts daily", status: "manual approval" },
      { icon: "R", name: "Repurposing Agent", role: "Turns one idea into many formats", cadence: "On demand", status: "planned" },
    ],
  },
  {
    label: "Layer 2",
    title: "Financial Operations",
    purpose: "Accounting + controls",
    tone: "green" as const,
    agents: [
      { icon: "A", name: "Wallet Audit Agent", role: "Runs x402Books wallet audits", cadence: "On demand", status: "active" },
      { icon: "S", name: "Scoring Agent", role: "Grades activity, treasury health, and risk", cadence: "Per report", status: "active" },
      { icon: "!", name: "Anomaly Agent", role: "Flags unusual flows and missing context", cadence: "Per audit", status: "active" },
    ],
  },
  {
    label: "Layer 3",
    title: "Registry + Agent Relations",
    purpose: "Growth + verification",
    tone: "pink" as const,
    agents: [
      { icon: "G", name: "Registry Agent", role: "Tracks agent wallets and confidence labels", cadence: "Weekly brief", status: "active" },
      { icon: "V", name: "Verification Agent", role: "Prepares wallet verification requests", cadence: "On demand", status: "planned" },
      { icon: "O", name: "Outreach Agent", role: "Drafts team-safe messages to agent projects", cadence: "On demand", status: "planned" },
    ],
  },
];


const COMMAND_QUEUE = [
  { item: "Daily X drafts", owner: "Content Strategist", time: "09:00", state: "scheduled" },
  { item: "Weekly agent research", owner: "Registry Agent", time: "Mon 18:00", state: "scheduled" },
  { item: "Agent Financial Registry", owner: "Luca", time: "Live", state: "done" },
  { item: "Luca → registry cron", owner: "Hermes / VPS", time: "Weekly", state: "active" },
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
    color: "#3b82f6",
    description: "Command-line interface for wallet scanning, reporting, and registry lookups.",
    items: [
      "x402books scan <wallet>",
      "x402books report <wallet>",
      "x402books score <wallet>",
      "x402books portfolio <wallet>",
      "x402books registry lookup <query>",
    ],
  },
  {
    tag: "SDK",
    title: "TypeScript SDK",
    color: "#8b5cf6",
    description: "Typed client for building apps on top of x402Books AI APIs.",
    items: [
      "ledgerSummary(wallet)",
      "transactions(wallet)",
      "fullReport(wallet)",
      "categorize(payload)",
      "agentFinancialState(wallet)",
      "registryLookup(query)",
    ],
  },
  {
    tag: "MCP",
    title: "MCP Server",
    color: "#f59e0b",
    description: "Model Context Protocol tools so other agents can call x402Books directly.",
    items: [
      "scan_wallet",
      "generate_report",
      "lookup_agent",
      "analyze_portfolio",
      "check_agent_score",
    ],
  },
];

const NAV: { section: Section; icon: string; label: string; group: string }[] = [
  { section: "overview", icon: "◇", label: "Overview",    group: "Overview" },
  { section: "registry", icon: "G",  label: "Registry",    group: "Operations" },
  { section: "growth",   icon: "↗",  label: "Growth OS",   group: "Operations" },
  { section: "reports",  icon: "📊", label: "Reports",     group: "Operations" },
  { section: "comm",     icon: "⌖",  label: "Comm Intel",  group: "Intelligence" },
  { section: "roadmap",  icon: "◈",  label: "Roadmap",     group: "Agent Tooling" },
  { section: "settings", icon: "⚙",  label: "Settings",    group: "System" },
];

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

// ── Sections ──────────────────────────────────────────────────────────────────

function OverviewSection({ health, today }: { health: HealthData | null; today: DailyMetric | null }) {
  const agentCount = LAYERS.reduce((t, l) => t + l.agents.length, 1);

  const services = [
    { label: "Alchemy",  ok: health?.services.alchemy  ?? null },
    { label: "Supabase", ok: health?.services.supabase ?? null },
    { label: "OpenAI",   ok: health?.services.openai   ?? null },
    { label: "Telegram", ok: Boolean(process.env.NEXT_PUBLIC_TG ?? true) },
  ];

  const quickStats = [
    { label: "Scans today",    value: today?.wallet_scans       ?? "—" },
    { label: "API calls",      value: today?.api_calls          ?? "—" },
    { label: "Luca chats",     value: today?.luca_interactions  ?? "—" },
    { label: "Failed scans",   value: today?.failed_scans       ?? "—" },
  ];

  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Private admin dashboard</p>
        <h1>Luca Command Center</h1>
        <p>{agentCount} agents · 3 layers · 1 manager agent{health ? ` · v${health.stage}` : ""}</p>
      </header>

      <section className={styles.masterCard}>
        <div className={styles.masterIcon}>L</div>
        <div>
          <h2>Luca</h2>
          <p>Manager Agent · AI Accountant · Agent Financial Registry</p>
        </div>
        <strong><span />Live 24/7</strong>
      </section>

      <section className={styles.metricsGrid}>
        {quickStats.map((m) => (
          <article key={m.label} className={styles.metricCard}>
            <p>{m.label}</p>
            <strong>{String(m.value)}</strong>
          </article>
        ))}
      </section>

      <div className={styles.healthRow}>
        {services.map((s) => (
          <div key={s.label} className={styles.healthChip} data-ok={s.ok === null ? "unknown" : s.ok ? "true" : "false"}>
            <span />
            {s.label}
          </div>
        ))}
      </div>

      <div className={styles.layers}>
        {LAYERS.map((layer) => (
          <section key={layer.title} className={`${styles.layerCard} ${styles[layer.tone]}`}>
            <div className={styles.layerHeader}>
              <span />
              <strong>{layer.label} — {layer.title}</strong>
              <em>/ {layer.purpose}</em>
            </div>
            <div className={styles.agentGrid}>
              {layer.agents.map((agent) => (
                <article key={agent.name} className={styles.agentCard}>
                  <div className={styles.agentIcon}>{agent.icon}</div>
                  <div>
                    <h3>{agent.name}</h3>
                    <p>{agent.role}</p>
                    <div className={styles.agentMeta}>
                      <span>{agent.cadence}</span>
                      <small>{agent.status}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Command Queue</h2>
            <span>Manual approval</span>
          </div>
          <div className={styles.queueList}>
            {COMMAND_QUEUE.map((task) => (
              <div key={task.item} className={styles.queueItem}>
                <div>
                  <strong>{task.item}</strong>
                  <p>{task.owner}</p>
                </div>
                <span>{task.time}</span>
                <small>{task.state}</small>
              </div>
            ))}
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Operating Policy</h2>
            <span>Admin only</span>
          </div>
          <ul className={styles.policyList}>
            {POLICIES.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </article>
      </section>
    </div>
  );
}

function RegistrySection() {
  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Layer 3 — Registry</p>
        <h1>Registry Management</h1>
        <p>Review and approve Luca&apos;s proposed changes to the Agent Financial Registry.</p>
      </header>

      <div className={styles.registryLinkCard}>
        <div>
          <strong>Pending Updates Queue</strong>
          <p>Luca pushes weekly updates here. Review proposed data changes before they go live on /registry.</p>
        </div>
        <Link href="/luca-admin/registry-updates" className={styles.actionBtn}>
          Open Queue →
        </Link>
      </div>

      <div className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <h3>How it works</h3>
          <ol className={styles.infoList}>
            <li>Luca scans agents weekly via Hermes cron on DO VPS</li>
            <li>Proposed changes POST to <code>/api/registry/luca-update</code></li>
            <li>Updates land in <code>registry_pending_updates</code></li>
            <li>You review and approve or reject at the queue</li>
            <li>Approved changes write to <code>registry_agents</code> and go live</li>
          </ol>
        </article>
        <article className={styles.infoCard}>
          <h3>Update types</h3>
          <div className={styles.typePills}>
            {[
              { label: "New Agent",     color: "#22c55e" },
              { label: "Score Update",  color: "#3b82f6" },
              { label: "Wallet Update", color: "#f59e0b" },
              { label: "Status Change", color: "#a855f7" },
            ].map((t) => (
              <span key={t.label} className={styles.typePill}
                style={{ background: `${t.color}22`, color: t.color }}>
                {t.label}
              </span>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function GrowthSection({ secret }: { secret: string }) {
  const [data, setData] = useState<GrowthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/growth", { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => r.json() as Promise<GrowthPayload>)
      .then((d) => { if (d.ok) setData(d); else setError(d.error ?? "Failed"); })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
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
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Growth OS</p>
        <h1>Platform Metrics</h1>
        <p>Internal tracking — wallet scans, API usage, registry activity.</p>
      </header>

      {loading && <div className={styles.stateBox}>Loading growth data…</div>}

      {!loading && error && (
        <div className={styles.stateBox} style={{ borderColor: "#ef444444", color: "#ef4444" }}>
          <p>{error}</p>
          <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
            If tables are missing, run <code>supabase/growth-schema.sql</code> in Supabase first.
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          <h2 className={styles.subHead}>Today</h2>
          <div className={styles.growthGrid}>
            {TODAY_CARDS.map((m) => (
              <article key={m.label} className={styles.growthCard}>
                <p>{m.label}</p>
                <strong>{n(m.value)}</strong>
              </article>
            ))}
          </div>

          {data && data.sevenDay.length > 0 && (
            <>
              <h2 className={styles.subHead}>Last 7 Days</h2>
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
            <p className={styles.emptyNote}>No daily metrics yet — data populates as activity happens.</p>
          )}

          <div className={styles.growthBottom}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Top Scanned Wallets</h2><span>7 days</span>
              </div>
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
                <p className={styles.emptyNote}>No scans logged yet.</p>
              )}
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Registry Activity</h2><span>Recent</span>
              </div>
              {data && data.registryEvents.length > 0 ? (
                <div className={styles.queueList}>
                  {data.registryEvents.slice(0, 8).map((e, i) => {
                    const c = e.event_type === "approval" ? "#22c55e"
                      : e.event_type === "rejection" ? "#ef4444" : "#f59e0b";
                    return (
                      <div key={i} className={styles.queueItem}>
                        <div>
                          <strong>{e.agent_name ?? "—"}</strong>
                          <p>{e.update_type ?? e.event_type}</p>
                        </div>
                        <span>{fmtDate(e.created_at)}</span>
                        <small style={{ color: c, background: `${c}22` }}>{e.event_type}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyNote}>No registry events yet.</p>
              )}
            </article>
          </div>

          {data && data.failedScans.length > 0 && (
            <>
              <h2 className={styles.subHead} style={{ color: "#ef4444" }}>Failed Scans</h2>
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

function RoadmapSection() {
  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Agent Tooling</p>
        <h1>Roadmap</h1>
        <p>Planned packages that make x402Books callable by other agents and developers.</p>
      </header>
      <div className={styles.roadmapGrid}>
        {ROADMAP.map((item) => (
          <article key={item.tag} className={styles.roadmapCard}
            style={{ borderColor: `${item.color}44` }}>
            <div className={styles.roadmapHeader}>
              <span className={styles.roadmapTag}
                style={{ background: `${item.color}22`, color: item.color }}>
                {item.tag}
              </span>
              <span className={styles.roadmapStatus}>Planned</span>
            </div>
            <h3 className={styles.roadmapTitle}>{item.title}</h3>
            <p className={styles.roadmapDesc}>{item.description}</p>
            <div className={styles.roadmapCmds}>
              {item.items.map((cmd) => (
                <code key={cmd} className={styles.roadmapCmd}>{cmd}</code>
              ))}
            </div>
          </article>
        ))}
      </div>
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
  wiretap:  "#f59e0b",
  telegram: "#3b82f6",
  x:        "#e5e7eb",
  email:    "#8b5cf6",
  discord:  "#6366f1",
  farcaster:"#a78bfa",
  other:    "#6b7280",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  confirmed:   "#22c55e",
  unverified:  "#f59e0b",
};

const LABEL_COLOR: Record<string, string> = {
  "payment request observed":   "#f59e0b",
  "settlement not confirmed":   "#ef4444",
  "needs wallet confirmation":  "#3b82f6",
  "reconciliation candidate":   "#a855f7",
};

type CommIdentity = {
  id?: string;
  platform: string;
  handle: string;
  url?: string | null;
  confidence: string;
  labels: string[];
  notes?: string | null;
};

type CommEntry = { agent_name: string } & CommIdentity;

const BLANK_FORM = { agent_name: "", platform: "wiretap", handle: "", url: "", confidence: "unverified", labels: [] as string[], notes: "" };

function CommIntelSection({ secret }: { secret: string }) {
  const [entries, setEntries] = useState<CommEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
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

  const filtered = entries.filter((e) =>
    !search || e.agent_name.toLowerCase().includes(search.toLowerCase()) || e.handle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Intelligence</p>
        <h1>Comm Intel</h1>
        <p>Agent communication identities — admin only. Not shown publicly.</p>
      </header>

      <div className={styles.registryLinkCard} style={{ marginBottom: "1rem" }}>
        <div>
          <strong>Communication identities are not wallet verification</strong>
          <p>Confirmed handle ≠ verified wallet. Payment request observed ≠ confirmed revenue.</p>
        </div>
        <button type="button" onClick={() => setAddOpen((v) => !v)} className={styles.actionBtn}>
          {addOpen ? "Cancel" : "+ Add Identity"}
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} style={{ marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.9rem", padding: "1.25rem", background: "rgba(17,18,20,0.72)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>AGENT NAME *</label>
              <input required value={form.agent_name} onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))}
                placeholder="e.g. Bankr" className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>PLATFORM *</label>
              <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }}>
                {COMM_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>HANDLE *</label>
              <input required value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                placeholder="@handle or ID" className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>URL</label>
              <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..." className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>CONFIDENCE *</label>
              <select value={form.confidence} onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))}
                className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }}>
                <option value="unverified">unverified</option>
                <option value="confirmed">confirmed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>NOTES</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Context..." className={styles.authInput} style={{ margin: 0, fontSize: "0.88rem", padding: "0.55rem 0.8rem" }} />
            </div>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={{ fontSize: "0.75rem", color: "#565b63", fontWeight: 700, display: "block", marginBottom: "0.45rem" }}>LABELS</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {COMM_LABELS.map((label) => {
                const active = form.labels.includes(label);
                const c = LABEL_COLOR[label];
                return (
                  <button key={label} type="button" onClick={() => toggleLabel(label)}
                    style={{ padding: "0.3rem 0.7rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", border: `1px solid ${active ? c : "rgba(255,255,255,0.1)"}`, background: active ? `${c}22` : "transparent", color: active ? c : "#565b63" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {saveError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{saveError}</p>}
          <button type="submit" disabled={saving} className={styles.actionBtn} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Identity"}
          </button>
        </form>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents or handles…"
        className={styles.authInput} style={{ margin: "0 0 1rem", fontSize: "0.88rem", padding: "0.6rem 0.85rem" }} />

      {loading && <div className={styles.stateBox}>Loading comm identities…</div>}
      {!loading && error && <div className={styles.stateBox} style={{ borderColor: "#ef444444", color: "#ef4444" }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.stateBox} style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "0.4rem", fontWeight: 700 }}>No comm identities yet</p>
          <p style={{ color: "#565b63", fontSize: "0.85rem" }}>Add the first one above.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {filtered.map((entry) => {
            const pc = PLATFORM_COLORS[entry.platform] ?? "#6b7280";
            const cc = CONFIDENCE_COLOR[entry.confidence] ?? "#6b7280";
            return (
              <article key={entry.id ?? entry.handle} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.85rem", background: "rgba(17,18,20,0.72)", padding: "1rem 1.2rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{entry.agent_name}</strong>
                      <span style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800, background: `${pc}22`, color: pc }}>
                        {entry.platform}
                      </span>
                      <code style={{ fontSize: "0.82rem", color: "#aabaf0" }}>{entry.handle}</code>
                      <span style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800, background: `${cc}22`, color: cc }}>
                        {entry.confidence}
                      </span>
                    </div>
                    {entry.labels.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.35rem" }}>
                        {entry.labels.map((l) => (
                          <span key={l} style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: `${LABEL_COLOR[l] ?? "#6b7280"}22`, color: LABEL_COLOR[l] ?? "#6b7280" }}>
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                    {entry.notes && <p style={{ color: "#777d86", fontSize: "0.82rem", margin: 0 }}>{entry.notes}</p>}
                    {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" style={{ color: "#7da2ff", fontSize: "0.78rem" }}>{entry.url}</a>}
                  </div>
                  {entry.id && (
                    <button type="button" onClick={() => handleDelete(entry.id!)} disabled={deleting === entry.id}
                      style={{ padding: "0.3rem 0.65rem", borderRadius: "0.4rem", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: deleting === entry.id ? 0.5 : 1 }}>
                      {deleting === entry.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </article>
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
      const res = await fetch("/api/cron/daily-report", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json() as { ok: boolean; preview?: string; error?: string };
      if (data.ok) {
        setPreview(data.preview ?? "");
        setStatus("done");
      } else {
        setError(data.error ?? "Failed to send");
        setStatus("error");
      }
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>ZHC Ops</p>
        <h1>Daily Reports</h1>
        <p>Luca sends a daily TLDR to your Telegram at 8:00 UTC. Trigger manually here.</p>
      </header>

      <div className={styles.registryLinkCard}>
        <div>
          <strong>Send Daily Ops Report</strong>
          <p>Pulls today&apos;s metrics — scans, API calls, registry activity, failed scans — and sends a TLDR to your Telegram.</p>
        </div>
        <button
          type="button"
          onClick={sendNow}
          disabled={status === "sending"}
          className={styles.actionBtn}
          style={{ opacity: status === "sending" ? 0.6 : 1 }}
        >
          {status === "sending" ? "Sending…" : status === "done" ? "Sent ✓" : "Send Now →"}
        </button>
      </div>

      {status === "error" && (
        <div className={styles.stateBox} style={{ borderColor: "#ef444444", color: "#ef4444", marginTop: "1rem" }}>
          {error}
        </div>
      )}

      {status === "done" && preview && (
        <article className={styles.panel} style={{ marginTop: "1.5rem" }}>
          <div className={styles.panelHeader}>
            <h2>Report Preview</h2>
            <span>Just sent to Telegram</span>
          </div>
          <pre style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.6rem",
            padding: "1rem 1.1rem",
            fontSize: "0.82rem",
            lineHeight: 1.7,
            color: "#c8cdd6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
          }}>
            {preview.replace(/<[^>]+>/g, "")}
          </pre>
        </article>
      )}

      <div className={styles.infoGrid} style={{ marginTop: "1.5rem" }}>
        <article className={styles.infoCard}>
          <h3>Schedule</h3>
          <ol className={styles.infoList}>
            <li>Luca on VPS calls <code>GET /api/cron/daily-report</code> daily</li>
            <li>Pulls wallet scans, API calls, failed scans, registry events</li>
            <li>Formats a TLDR and sends to <code>LUCA_ADMIN_CHAT_ID</code></li>
            <li>Use &quot;Send Now&quot; above to trigger manually anytime</li>
          </ol>
        </article>
        <article className={styles.infoCard}>
          <h3>Required env vars</h3>
          <div className={styles.envList}>
            {["TELEGRAM_BOT_TOKEN", "LUCA_ADMIN_CHAT_ID", "X402BOOKS_INTERNAL_SECRET"].map((key) => (
              <div key={key} className={styles.envRow}>
                <code>{key}</code>
              </div>
            ))}
          </div>
        </article>
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
    { key: "LUCA_ADMIN_CHAT_ID",         ok: null },
  ];

  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>System</p>
        <h1>Settings</h1>
        <p>Policies, environment, and session management.</p>
      </header>
      <div className={styles.settingsGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><h2>Operating Policy</h2></div>
          <ul className={styles.policyList}>
            {POLICIES.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Environment</h2>
            {health && <span>v{health.stage}</span>}
          </div>
          <div className={styles.envList}>
            {envStatus.map(({ key, ok }) => (
              <div key={key} className={styles.envRow}>
                <code>{key}</code>
                {ok === null
                  ? <span style={{ color: "#565b63", fontSize: "0.78rem", fontWeight: 700 }}>● unknown</span>
                  : ok
                  ? <span className={styles.envSet}>● set</span>
                  : <span style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 700 }}>● missing</span>
                }
              </div>
            ))}
          </div>
        </article>
      </div>
      <button type="button" onClick={onSignOut} className={styles.signOutBtn}>
        Sign out of admin
      </button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LucaAdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [secret, setSecret]       = useState("");
  const [input, setInput]         = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [section, setSection]     = useState<Section>("overview");
  const [health, setHealth]       = useState<HealthData | null>(null);
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
    const headers = { Authorization: `Bearer ${secret}` };
    fetch("/api/registry/pending", { headers })
      .then((r) => r.json())
      .then((d: { ok: boolean; updates?: unknown[] }) => { if (d.ok) setPendingCount(d.updates?.length ?? 0); })
      .catch(() => {});
    fetch("/api/admin/growth", { headers })
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
        sessionStorage.setItem("luca_admin_secret", input);
        setSecret(input);
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
      <main className={styles.authGate}>
        <div className={styles.authCard}>
          <div className={styles.brand} style={{ marginBottom: "1.75rem" }}>
            <div className={styles.logo}>L</div>
            <div>
              <p className={styles.brandName}>Luca Admin</p>
              <p className={styles.brandSub}>x402Books Command Center</p>
            </div>
          </div>
          <p style={{ color: "#777d86", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
            Enter your admin password to continue.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
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
      </main>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  const groups = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>L</div>
          <div>
            <p className={styles.brandName}>Luca Admin</p>
            <p className={styles.brandSub}>x402Books</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className={styles.navLabel}>{group}</p>
              {items.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => setSection(item.section)}
                  className={section === item.section ? styles.navItemActive : styles.navItem}
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.section === "registry" && pendingCount > 0 && (
                    <em className={styles.navBadge}>{pendingCount}</em>
                  )}
                </button>
              ))}
            </div>
          ))}

          <p className={styles.navLabel}>Quick Links</p>
          <Link href="/luca-admin/registry-updates" className={styles.navItem}>
            <span>✓</span>Pending Updates
          </Link>
          <Link href="/registry" className={styles.navItem} target="_blank" rel="noreferrer">
            <span>↗</span>Public Registry
          </Link>
        </nav>

        <div className={styles.livePill}><span />Live · VPS</div>
      </aside>

      <section className={styles.workspace}>
        {section === "overview"  && <OverviewSection health={health} today={todayMetrics} />}
        {section === "registry"  && <RegistrySection />}
        {section === "growth"    && <GrowthSection secret={secret} />}
        {section === "reports"   && <ReportsSection secret={secret} />}
        {section === "comm"      && <CommIntelSection secret={secret} />}
        {section === "roadmap"   && <RoadmapSection />}
        {section === "settings"  && <SettingsSection onSignOut={handleSignOut} health={health} />}
      </section>
    </main>
  );
}
