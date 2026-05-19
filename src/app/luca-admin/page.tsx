"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "overview" | "registry" | "growth" | "roadmap" | "settings";

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

const SYSTEM_METRICS = [
  { label: "Gateway", value: "Live", detail: "DigitalOcean VPS" },
  { label: "Cron Jobs", value: "3", detail: "Drafts, research, registry" },
  { label: "Backups", value: "Daily", detail: "14-day retention" },
  { label: "Mode", value: "Manual", detail: "Dan approves posts" },
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
  { section: "overview", icon: "◇", label: "Overview",  group: "Overview" },
  { section: "registry", icon: "G",  label: "Registry",  group: "Operations" },
  { section: "growth",   icon: "↗",  label: "Growth OS", group: "Operations" },
  { section: "roadmap",  icon: "◈",  label: "Roadmap",   group: "Agent Tooling" },
  { section: "settings", icon: "⚙",  label: "Settings",  group: "System" },
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

function OverviewSection() {
  const agentCount = LAYERS.reduce((t, l) => t + l.agents.length, 1);
  return (
    <div>
      <header className={styles.sectionHead}>
        <p className={styles.kicker}>Private admin dashboard</p>
        <h1>Luca Command Center</h1>
        <p>{agentCount} agents · 3 layers · 1 manager agent</p>
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
        {SYSTEM_METRICS.map((m) => (
          <article key={m.label} className={styles.metricCard}>
            <p>{m.label}</p>
            <strong>{m.value}</strong>
            <span>{m.detail}</span>
          </article>
        ))}
      </section>

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

function SettingsSection({ onSignOut }: { onSignOut: () => void }) {
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
          <div className={styles.panelHeader}><h2>Environment</h2></div>
          <div className={styles.envList}>
            {[
              "X402BOOKS_INTERNAL_SECRET",
              "SUPABASE_SERVICE_ROLE_KEY",
              "NEXT_PUBLIC_SUPABASE_URL",
            ].map((key) => (
              <div key={key} className={styles.envRow}>
                <code>{key}</code>
                <span className={styles.envSet}>● set</span>
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

  useEffect(() => {
    const stored = sessionStorage.getItem("luca_admin_secret");
    if (stored) { setSecret(stored); setAuthed(true); }
  }, []);

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
                  <span>{item.icon}</span>{item.label}
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
        {section === "overview"  && <OverviewSection />}
        {section === "registry"  && <RegistrySection />}
        {section === "growth"    && <GrowthSection secret={secret} />}
        {section === "roadmap"   && <RoadmapSection />}
        {section === "settings"  && <SettingsSection onSignOut={handleSignOut} />}
      </section>
    </main>
  );
}
