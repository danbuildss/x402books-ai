import { Logo, LogoMark } from "@/components/logo";
import {
  FadeContent,
  GlassIcons,
  TextType,
  ThemeToggle,
} from "@/components/effects";
import { WaitlistForm } from "@/lib/waitlist-form";
import { ScrollLink } from "@/components/scroll-link";
import Link from "next/link";

const features = [
  {
    title: "Detect payment patterns",
    body: "Identify repeated USDC microtransactions and label them as likely x402 when the signal is clear.",
  },
  {
    title: "Clean wallet books",
    body: "See income, spend, counterparties, categories, and net flow without reading raw exports.",
  },
  {
    title: "Export reports",
    body: "Create CSV rows and agent-readable JSON summaries for apps, agents, and operators.",
  },
];

const featureIcons = [
  {
    color: "green",
    label: "Scan",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Books",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h9a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z" />
        <path d="M8 16h10M9 8h5M9 11h6" />
      </svg>
    ),
  },
  {
    color: "pink",
    label: "Export",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 19h14" />
      </svg>
    ),
  },
];

const steps = [
  ["01", "Paste a wallet", "Start with a Base wallet address."],
  ["02", "Scan USDC", "Fetch and normalize transfer activity."],
  ["03", "Label payments", "Mark repeated micropayments as likely x402."],
  ["04", "Export books", "Download CSV and agent-readable JSON."],
];

const reportRows = [
  ["API calls", "$18.40", "likely x402"],
  ["Data access", "$11.25", "likely x402"],
  ["Agent service income", "$91.20", "income"],
  ["Compute", "$13.15", "expense"],
];

const previewRows = [
  ["0.42 USDC", "Expense", "API call", "0xabc...", "2h ago"],
  ["1.20 USDC", "Expense", "Data access", "0xdef...", "5h ago"],
  ["12.80 USDC", "Income", "Agent service", "0xghi...", "1d ago"],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Logo />
        <nav aria-label="Main navigation">
          <ScrollLink targetId="how">How it works</ScrollLink>
          <ScrollLink targetId="features">Features</ScrollLink>
          <ScrollLink targetId="pricing">Pricing</ScrollLink>
          <ScrollLink targetId="report">Sample report</ScrollLink>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="nav-cta subtle" href="/access">
            Open App
          </Link>
          <ScrollLink className="nav-cta" targetId="waitlist">
            Join Waitlist
          </ScrollLink>
        </div>
      </header>

      <section className="hero-shell">
        <FadeContent>
          <div className="hero-copy">
            <p className="eyebrow">
              Readable books for the x402 economy
            </p>
            <h1>Make agent payments readable.</h1>
            <p className="typing-line">
              <TextType
                texts={[
                  "Paste a wallet.",
                  "Scan Base USDC.",
                  "Export clean books.",
                ]}
                typingSpeed={56}
                deletingSpeed={34}
                pauseDuration={1300}
                showCursor
                cursorCharacter="_"
              />
            </p>
            <p className="hero-subtext">
              x402Books AI turns raw USDC microtransactions into clear reports,
              categories, and agent-readable financial summaries.
            </p>
            <p className="trust-note">Product first. Token later.</p>
            <div className="hero-actions">
              <Link className="primary-button" href="/access">
                Open Private Beta
              </Link>
              <ScrollLink className="secondary-button" targetId="report">
                View Sample Report
              </ScrollLink>
            </div>
          </div>
        </FadeContent>

        <div className="hero-visual" aria-label="x402Books AI product preview">
          <div className="dashboard-card">
            <div className="card-topline">
              <LogoMark />
              <span>Wallet report</span>
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
            <div className="signal-list">
              <div>
                <span>Likely x402</span>
                <strong>128 payments</strong>
              </div>
              <div>
                <span>Top counterparty</span>
                <strong>0x91...a8c2</strong>
              </div>
              <div>
                <span>Export status</span>
                <strong>CSV + JSON ready</strong>
              </div>
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
        </div>
      </section>

      <section className="trust-strip" aria-label="Product metrics preview">
        <div>
          <span>128</span>
          <p>Likely x402 signals</p>
        </div>
        <div>
          <span>USDC</span>
          <p>Base payment asset</p>
        </div>
        <div>
          <span>JSON</span>
          <p>Agent output</p>
        </div>
      </section>

      <FadeContent delay={80}>
        <section className="section-heading" id="how">
          <h2>How it works</h2>
          <p>
            A simple flow for turning wallet activity into readable records.
          </p>
        </section>
      </FadeContent>

      <section className="steps-grid">
        {steps.map(([number, title, body]) => (
          <FadeContent key={title} delay={Number(number) * 70}>
            <article className="step-card">
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          </FadeContent>
        ))}
      </section>

      <section className="screenshots-section" aria-label="App screenshots">
        <div className="section-heading compact">
          <p className="micro-label">App preview</p>
          <h2>What the first dashboard will look like.</h2>
          <p>
            A clean wallet view for spend, income, categories, and agent-readable
            reports.
          </p>
        </div>
        <div className="screenshot-grid">
          <article className="app-shot dashboard-shot">
            <div className="shot-header">
              <div>
                <span>Wallet</span>
                <strong>0x7d...42f1</strong>
              </div>
              <div className="range-toggle">
                <span>7d</span>
                <strong>30d</strong>
              </div>
            </div>
            <div className="shot-metrics">
              <div><span>Spend</span><strong>$42.80</strong></div>
              <div><span>Income</span><strong>$91.20</strong></div>
              <div><span>Net</span><strong>+$48.40</strong></div>
              <div><span>Txs</span><strong>128</strong></div>
            </div>
            <div className="shot-body">
              <div className="line-chart">
                <span style={{ height: "32%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "41%" }} />
                <span style={{ height: "74%" }} />
                <span style={{ height: "52%" }} />
                <span style={{ height: "68%" }} />
              </div>
              <div className="category-list">
                <div><span>API calls</span><strong>$18.40</strong></div>
                <div><span>Data access</span><strong>$11.25</strong></div>
                <div><span>Compute</span><strong>$13.15</strong></div>
              </div>
            </div>
          </article>

          <article className="app-shot table-shot">
            <div className="shot-header">
              <div>
                <span>Transactions</span>
                <strong>Clean ledger rows</strong>
              </div>
              <span className="status-pill">CSV ready</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Counterparty</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(([amount, type, category, counterparty, time]) => (
                  <tr key={`${amount}-${counterparty}`}>
                    <td>{amount}</td>
                    <td>{type}</td>
                    <td>{category}</td>
                    <td>{counterparty}</td>
                    <td>{time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="app-shot json-shot">
            <div className="shot-header">
              <div>
                <span>Agent API</span>
                <strong>Summary response</strong>
              </div>
              <span className="status-pill">JSON</span>
            </div>
            <pre>{`{
  "total_spend": 42.8,
  "total_income": 91.2,
  "top_category": "api_call",
  "budget_status": "safe"
}`}</pre>
          </article>
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading compact">
          <h2>Financial visibility for agent payments.</h2>
          <p>
            Start with the ledger. Add the API, exports, and automation as usage
            grows.
          </p>
        </div>
        <GlassIcons items={featureIcons} />
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
          <h2>A cleaner report from raw wallet activity.</h2>
          <p>
            Track spend, income, categories, and likely x402 activity from one
            wallet view.
          </p>
          <Link className="primary-button small" href="/access">
            Open Private Beta
          </Link>
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

      <section className="pricing-section" id="pricing">
        <div>
          <p className="micro-label">Pricing</p>
          <h2>Free while the scanner launches.</h2>
        </div>
        <p>
          Early users help shape wallet scans, CSV exports, and the first API
          access tier.
        </p>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="waitlist-copy">
          <p className="micro-label">Early access</p>
          <h2>Join the early access list.</h2>
          <p>
            Get updates as wallet scans, x402 labels, exports, and reports ship.
          </p>
          <p className="trust-note">No token required for early access.</p>
        </div>
        <WaitlistForm />
      </section>

      <footer>
        <div className="footer-brand">
          <Logo />
          <p>Readable books for the x402 economy.</p>
          <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">
            Built by @danbuildss
          </a>
        </div>
        <div className="footer-links">
          <div>
            <h3>Product</h3>
            <ScrollLink targetId="how">How it works</ScrollLink>
            <ScrollLink targetId="features">Features</ScrollLink>
            <ScrollLink targetId="pricing">Pricing</ScrollLink>
          </div>
          <div>
            <h3>Company</h3>
            <ScrollLink targetId="waitlist">Privacy</ScrollLink>
            <ScrollLink targetId="waitlist">Terms</ScrollLink>
            <ScrollLink targetId="waitlist">Support</ScrollLink>
          </div>
          <div>
            <h3>Connect</h3>
            <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">
              X (formerly Twitter)
            </a>
          </div>
        </div>
        <p className="copyright">© 2026 x402Books. All rights reserved.</p>
      </footer>
    </main>
  );
}
