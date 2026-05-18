import styles from "./page.module.css";

const layers = [
  {
    label: "Layer 1",
    title: "Content Intelligence",
    purpose: "Research + publishing",
    tone: "blue",
    agents: [
      {
        icon: "B",
        name: "Content Strategist",
        role: "Decides what Luca should say",
        cadence: "1x daily + 1x weekly",
        status: "active",
      },
      {
        icon: "X",
        name: "X Research Agent",
        role: "Studies agents, narratives, and public signals",
        cadence: "Always watching",
        status: "active",
      },
      {
        icon: "W",
        name: "Writer Agent",
        role: "Drafts posts, threads, and audit notes",
        cadence: "5 drafts daily",
        status: "manual approval",
      },
      {
        icon: "R",
        name: "Repurposing Agent",
        role: "Turns one idea into many formats",
        cadence: "On demand",
        status: "planned",
      },
    ],
  },
  {
    label: "Layer 2",
    title: "Financial Operations",
    purpose: "Accounting + controls",
    tone: "green",
    agents: [
      {
        icon: "A",
        name: "Wallet Audit Agent",
        role: "Runs x402Books wallet audits",
        cadence: "On demand",
        status: "active",
      },
      {
        icon: "S",
        name: "Scoring Agent",
        role: "Grades activity, treasury health, and risk",
        cadence: "Per report",
        status: "active",
      },
      {
        icon: "!",
        name: "Anomaly Agent",
        role: "Flags unusual flows and missing context",
        cadence: "Per audit",
        status: "active",
      },
    ],
  },
  {
    label: "Layer 3",
    title: "Registry + Agent Relations",
    purpose: "Growth + verification",
    tone: "pink",
    agents: [
      {
        icon: "G",
        name: "Registry Agent",
        role: "Tracks agent wallets and confidence labels",
        cadence: "Weekly brief",
        status: "active",
      },
      {
        icon: "V",
        name: "Verification Agent",
        role: "Prepares wallet verification requests",
        cadence: "On demand",
        status: "planned",
      },
      {
        icon: "O",
        name: "Outreach Agent",
        role: "Drafts team-safe messages to agent projects",
        cadence: "On demand",
        status: "planned",
      },
    ],
  },
];

const metrics = [
  { label: "Gateway", value: "Live", detail: "DigitalOcean VPS" },
  { label: "Cron Jobs", value: "3", detail: "Drafts, research, health" },
  { label: "Backups", value: "Daily", detail: "14-day retention" },
  { label: "Mode", value: "Manual", detail: "Dan approves posts" },
];

const queue = [
  {
    item: "Daily X drafts",
    owner: "Content Strategist",
    time: "09:00",
    state: "scheduled",
  },
  {
    item: "Weekly agent research brief",
    owner: "Registry Agent",
    time: "Mon 18:00",
    state: "scheduled",
  },
  {
    item: "Agent Financial Registry launch",
    owner: "Luca",
    time: "This week",
    state: "priority",
  },
  {
    item: "Bankr profile completion",
    owner: "Registry Agent",
    time: "Pending avatar URL",
    state: "needs input",
  },
];

const policies = [
  "Only Dan can publish to X or approve Bankr write actions.",
  "Public users can ask questions, request reports, and audit their own wallets.",
  "$XBOOKS powers the platform. $LUCA represents Luca's community and agent identity.",
  "Wallets are never called official unless verified by evidence.",
];

export default function LucaAdminPage() {
  const agentCount = layers.reduce((total, layer) => total + layer.agents.length, 1);

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>L</div>
          <div>
            <p className={styles.brandName}>Luca</p>
            <p className={styles.brandSub}>Command Center</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navLabel}>Overview</p>
          <a className={styles.navItemActive} href="#overview">
            <span>◇</span> Overview
          </a>

          <p className={styles.navLabel}>Layer 1 - Content</p>
          <a className={styles.navItem} href="#content">
            <span>B</span> Content Strategy
          </a>
          <a className={styles.navItem} href="#content">
            <span>X</span> X Research
          </a>
          <a className={styles.navItem} href="#content">
            <span>W</span> Draft Queue
          </a>

          <p className={styles.navLabel}>Layer 2 - Finance</p>
          <a className={styles.navItem} href="#finance">
            <span>A</span> Wallet Audits
          </a>
          <a className={styles.navItem} href="#finance">
            <span>S</span> Scoring
          </a>
          <a className={styles.navItem} href="#finance">
            <span>!</span> Anomalies
          </a>

          <p className={styles.navLabel}>Layer 3 - Registry</p>
          <a className={styles.navItem} href="#registry">
            <span>G</span> Agent Registry
          </a>
          <a className={styles.navItem} href="#registry">
            <span>V</span> Verification
          </a>

          <p className={styles.navLabel}>System</p>
          <a className={styles.navItem} href="#system">
            <span>◎</span> Policies
          </a>
          <a className={styles.navItem} href="#system">
            <span>#</span> Schedule
          </a>
        </nav>

        <div className={styles.livePill}>
          <span />
          Live · VPS
        </div>
      </aside>

      <section className={styles.workspace}>
        <header id="overview" className={styles.header}>
          <div>
            <p className={styles.kicker}>Private admin dashboard</p>
            <h1>Luca Command Center</h1>
            <p>{agentCount} agents · 3 layers · 1 manager agent</p>
          </div>
          <div className={styles.headerActions}>
            <a href="https://x.com/AskLucaAI" target="_blank" rel="noreferrer">
              X
            </a>
            <a href="https://www.x402books.xyz" target="_blank" rel="noreferrer">
              x402Books
            </a>
          </div>
        </header>

        <section className={styles.masterCard}>
          <div className={styles.masterIcon}>L</div>
          <div>
            <h2>Luca</h2>
            <p>Manager Agent · AI Accountant · Agent Financial Registry</p>
          </div>
          <strong>
            <span /> Live 24/7
          </strong>
        </section>

        <section className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </section>

        <div className={styles.layers}>
          {layers.map((layer) => (
            <section
              key={layer.title}
              id={
                layer.title.includes("Content")
                  ? "content"
                  : layer.title.includes("Financial")
                    ? "finance"
                    : "registry"
              }
              className={`${styles.layerCard} ${styles[layer.tone]}`}
            >
              <div className={styles.layerHeader}>
                <span />
                <strong>{layer.label} - {layer.title}</strong>
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

        <section id="system" className={styles.bottomGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Command Queue</h2>
              <span>Manual approval</span>
            </div>
            <div className={styles.queueList}>
              {queue.map((task) => (
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
              {policies.map((policy) => (
                <li key={policy}>{policy}</li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
