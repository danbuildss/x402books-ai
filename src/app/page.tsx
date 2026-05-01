import { Logo, LogoMark } from "@/components/logo";
import { WaitlistForm } from "@/lib/waitlist-form";

const features = [
  {
    title: "Likely x402 Detection",
    body: "Spot repeated Base USDC micropayment patterns without claiming certainty when metadata is missing.",
  },
  {
    title: "Income & Spend Books",
    body: "Turn raw wallet activity into clear totals, counterparties, categories, and net flow.",
  },
  {
    title: "Agent-Readable Reports",
    body: "Generate clean JSON summaries your agent, app, or internal tool can consume.",
  },
];

const steps = [
  ["01", "Paste Wallet", "Drop in any Base wallet address when the scanner opens."],
  ["02", "Scan USDC Activity", "Fetch transfers and identify payment-like microtransaction behavior."],
  ["03", "Get Readable Books", "Review spend, income, likely x402 payments, and export-ready reports."],
];

const reportRows = [
  ["API calls", "$18.40", "likely x402"],
  ["Data access", "$11.25", "likely x402"],
  ["Agent service income", "$91.20", "income"],
  ["Compute", "$13.15", "expense"],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#report">Sample report</a>
        </nav>
        <a className="nav-cta" href="#waitlist">
          Join Waitlist
        </a>
      </header>

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span>Readable books for the x402 economy</span>
            <span aria-hidden="true">-&gt;</span>
          </p>
          <h1>Your agent&apos;s books, finally readable.</h1>
          <p className="hero-subtext">
            x402Books AI turns raw Base USDC payments into clean spend reports,
            income summaries, and audit-ready exports for builders and AI agents.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#waitlist">
              Analyze Wallet
            </a>
            <a className="secondary-button" href="#report">
              View Sample Report
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="x402Books AI product preview">
          <div className="dashboard-card">
            <div className="card-topline">
              <LogoMark />
              <span>April 2026 Agent Spend</span>
            </div>
            <div className="metric-stack">
              <div>
                <span>Total Income</span>
                <strong>$91.20</strong>
              </div>
              <div>
                <span>Total Spend</span>
                <strong>$42.80</strong>
              </div>
            </div>
            <div className="net-flow">
              <span>Net Flow</span>
              <strong>+$48.40</strong>
            </div>
            <div className="chart-preview">
              <span style={{ height: "38%" }} />
              <span style={{ height: "62%" }} />
              <span style={{ height: "44%" }} />
              <span style={{ height: "78%" }} />
              <span style={{ height: "50%" }} />
              <span style={{ height: "70%" }} />
            </div>
          </div>
          <div className="floating-pill income">Income +$12.80</div>
          <div className="floating-pill spend">API call -$0.42</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product metrics preview">
        <div>
          <span>128</span>
          <p>Likely x402 payments</p>
        </div>
        <div>
          <span>4</span>
          <p>Core report views</p>
        </div>
        <div>
          <span>Base USDC</span>
          <p>Focused chain and asset</p>
        </div>
      </section>

      <section className="section-heading" id="how">
        <h2>How it works</h2>
        <p>
          A simple flow for turning agent payment activity into readable financial
          records.
        </p>
      </section>

      <section className="steps-grid">
        {steps.map(([number, title, body]) => (
          <article className="step-card" key={title}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading compact">
          <h2>Financial visibility for AI agents.</h2>
          <p>
            Product first, token later. The MVP focuses on useful reporting for
            builders handling real microtransactions.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" id="report">
        <div className="report-copy">
          <p className="micro-label">Sample report</p>
          <h2>April 2026 Agent Spend Report</h2>
          <p>
            Wallet summaries should read like books, not block explorer residue.
            x402Books AI keeps uncertainty visible while still giving builders a
            clean operating view.
          </p>
          <a className="primary-button small" href="#waitlist">
            Get Early Access
          </a>
        </div>
        <div className="report-card">
          <div className="report-header">
            <div>
              <span>Wallet</span>
              <strong>0x7d...42f1</strong>
            </div>
            <span className="status-pill">Likely x402: 128</span>
          </div>
          <div className="summary-grid">
            <div>
              <span>Spend</span>
              <strong>$42.80</strong>
            </div>
            <div>
              <span>Income</span>
              <strong>$91.20</strong>
            </div>
            <div>
              <span>Net</span>
              <strong>+$48.40</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map(([category, amount, signal]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{amount}</td>
                  <td>{signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="waitlist-copy">
          <p className="micro-label">Early access</p>
          <h2>Join the first wave of agent accounting.</h2>
          <p>
            Get updates as wallet scans, likely x402 detection, CSV exports, and
            agent-readable reports ship.
          </p>
        </div>
        <WaitlistForm />
      </section>

      <footer>
        <Logo />
        <p>Readable books for the x402 economy.</p>
        <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">
          Built by @danbuildss
        </a>
      </footer>
    </main>
  );
}
