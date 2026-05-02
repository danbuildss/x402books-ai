import { Logo, LogoMark } from "@/components/logo";
import {
  BorderGlow,
  FadeContent,
  GlassIcons,
  ShinyText,
  TextType,
  ThemeToggle,
} from "@/components/effects";
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
    title: "CSV + Agent JSON",
    body: "Export clean rows for humans and structured summaries your agent or app can consume.",
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
  ["01", "Paste Base Wallet", "Drop in a wallet address when the first scanner opens."],
  ["02", "Scan USDC Transfers", "Fetch Base USDC activity and normalize raw transfer records."],
  ["03", "Label x402 Signals", "Flag repeated micropayment behavior as likely x402, not guaranteed."],
  ["04", "Export Books", "Review reports, CSV rows, and agent-readable JSON summaries."],
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
          <a href="#pricing">Pricing</a>
          <a href="#report">Sample report</a>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <a className="nav-cta" href="#waitlist">
            Join Waitlist
          </a>
        </div>
      </header>

      <section className="hero-shell">
        <FadeContent>
          <div className="hero-copy">
            <p className="eyebrow">
              <ShinyText text="Built for Base USDC and likely x402 payment activity" speed={4} />
              <span aria-hidden="true">-&gt;</span>
            </p>
            <h1>Your agent&apos;s books, finally readable.</h1>
            <p className="typing-line">
              <TextType
                texts={[
                  "Paste a wallet. Get readable x402 books.",
                  "Scan Base USDC activity in seconds.",
                  "Export reports humans and agents can understand.",
                ]}
                typingSpeed={56}
                deletingSpeed={34}
                pauseDuration={1300}
                showCursor
                cursorCharacter="_"
              />
            </p>
            <p className="hero-subtext">
              x402Books AI turns raw Base USDC payments into clean spend reports,
              income summaries, and audit-ready exports for builders and AI agents.
            </p>
            <p className="trust-note">Product-first early access. No token required.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#waitlist">
                Get Wallet Scan Access
              </a>
              <a className="secondary-button" href="#report">
                View Sample Report
              </a>
            </div>
          </div>
        </FadeContent>

        <div className="hero-visual" aria-label="x402Books AI product preview">
          <BorderGlow>
            <div className="dashboard-card">
              <div className="card-topline">
                <LogoMark />
                <span>Base USDC Wallet Report</span>
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
          </BorderGlow>
          <div className="floating-pill income">Income +$12.80</div>
          <div className="floating-pill spend">API call -$0.42</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product metrics preview">
        <div>
          <span>128</span>
          <p>Sample likely x402 signals</p>
        </div>
        <div>
          <span>USDC</span>
          <p>Focused Base payment asset</p>
        </div>
        <div>
          <span>JSON</span>
          <p>Agent-readable output</p>
        </div>
      </section>

      <FadeContent delay={80}>
        <section className="section-heading" id="how">
          <h2>How it works</h2>
          <p>
            A simple flow for turning agent payment activity into readable financial
            records.
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

      <section className="feature-section" id="features">
        <div className="section-heading compact">
          <h2>Financial visibility for AI agents.</h2>
          <p>
            Product first, token later. The MVP focuses on useful reporting for
            builders handling real microtransactions.
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
          <h2>Base USDC Wallet Report</h2>
          <p>
            Wallet summaries should read like books, not block explorer residue.
            x402Books AI keeps uncertainty visible while still giving builders a
            clean operating view.
          </p>
          <a className="primary-button small" href="#waitlist">
            Get Wallet Scan Access
          </a>
        </div>
        <BorderGlow>
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
        </BorderGlow>
      </section>

      <section className="pricing-section" id="pricing">
        <div>
          <p className="micro-label">Pricing</p>
          <h2>Free while the first scanner ships.</h2>
        </div>
        <p>
          Early access is free. Paid API access comes later after builders have
          helped shape wallet scans, CSV exports, and agent-readable summaries.
        </p>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="waitlist-copy">
          <p className="micro-label">Early access</p>
          <h2>Join the first wave of agent accounting.</h2>
          <p>
            Get updates as wallet scans, likely x402 detection, CSV exports, and
            agent-readable reports ship.
          </p>
          <p className="trust-note">Product-first. Token later, only after usage.</p>
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
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h3>Company</h3>
            <a href="#waitlist">Privacy</a>
            <a href="#waitlist">Terms</a>
            <a href="#waitlist">Support</a>
          </div>
          <div>
            <h3>Connect</h3>
            <a href="https://x.com/danbuildss" target="_blank" rel="noreferrer">
              X (formerly Twitter)
            </a>
          </div>
        </div>
        <p className="copyright">© 2026 x402Books AI. All rights reserved.</p>
      </footer>
    </main>
  );
}
