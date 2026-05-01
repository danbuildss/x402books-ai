import { WaitlistForm } from "@/lib/waitlist-form";

const topFeatures = [
  {
    title: "Income & Expense Categorization",
    body: "Automatically classify Base USDC flows so agent activity becomes readable immediately.",
  },
  {
    title: "Comprehensive Wallet Analysis",
    body: "Track spend, income, counterparties, and likely x402-style microtransaction patterns.",
  },
];

const progressFeatures = [
  {
    title: "Effortless Budget Management",
    body: "Monitor wallet outflows and set practical spend boundaries for agents and teams.",
  },
  {
    title: "Optimize Spending Habits",
    body: "Use trend insights to reduce wasteful API/data costs and improve agent margins.",
  },
];

export default function HomePage() {
  return (
    <main className="lp-bg">
      <div className="lp-shell">
        <section className="hero-card">
          <header className="hero-nav">
            <strong>x402Books AI</strong>
            <nav>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
            </nav>
            <a href="#waitlist" className="pill-btn">Join Waitlist</a>
          </header>

          <div className="hero-grid" id="home">
            <div>
              <p className="mini-pill">Readable books for the agent economy</p>
              <h1>Your agent’s books, finally readable.</h1>
              <p>
                Turn raw Base USDC microtransactions into clean reports, spend categories, and
                agent-readable financial summaries.
              </p>
              <a href="#waitlist" className="primary-btn">Get Early Access ↗</a>
            </div>
            <div className="phone-stage">
              <div className="phone-card" />
              <div className="float-chip chip-income">Income +$2,239.87</div>
              <div className="float-chip chip-expense">Expenses $1,234.75</div>
            </div>
          </div>
        </section>

        <section className="feature-header" id="features">
          <h2>Powerful features to elevate your financial experience</h2>
          <p>
            Built for builders, teams, and agents that need clean books, reliable classifications,
            and budget visibility.
          </p>
        </section>

        <section className="feature-grid two">
          {topFeatures.map((item) => (
            <article className="soft-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="placeholder-ui" />
            </article>
          ))}
        </section>

        <section className="soft-card wide" id="how">
          <h2>How it works</h2>
          <p>Simplify your financial workflow in three quick steps.</p>
          <div className="steps-three">
            <article><h4>Paste wallet</h4><p>Scan any Base wallet or agent address.</p></article>
            <article><h4>Analyze USDC activity</h4><p>Detect likely x402 patterns and repeated microtransactions.</p></article>
            <article><h4>Generate clean books</h4><p>Get spend, income, categories, exports, and API-ready summaries.</p></article>
          </div>
        </section>

        <section className="feature-grid two">
          {progressFeatures.map((item) => (
            <article className="soft-card split" key={item.title}>
              <div className="placeholder-ui tall" />
              <div>
                <p className="eyebrow">Why choose us</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <a href="#waitlist" className="pill-btn filled">See Detail →</a>
              </div>
            </article>
          ))}
        </section>

        <section className="waitlist-card" id="waitlist">
          <h2>Join the first wave of agent accounting.</h2>
          <p>Get early access to wallet scans, AI-categorized reports, and the x402Books API.</p>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
