import { WaitlistForm } from "@/lib/waitlist-form";

const features = [
  {
    title: "USDC Spend Categorization",
    body: "Convert noisy Base transfers into clear categories with conservative labels.",
  },
  {
    title: "Likely x402 Detection",
    body: "Identify recurring micro-payments and service patterns without overclaiming certainty.",
  },
  {
    title: "Agent-Readable Reports",
    body: "Export clean summaries for builders, teams, and autonomous agent workflows.",
  },
];

const how = [
  ["Paste wallet", "Scan any Base wallet or agent address in seconds."],
  ["Analyze activity", "Process USDC inflows, outflows, and repeated microtransactions."],
  ["Generate books", "Get clean spend reports, categories, and CSV-ready records."],
];

export default function HomePage() {
  return (
    <main className="page">
      <div className="shell">
        <header className="nav">
          <div className="brand">x402Books AI</div>
          <nav>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#waitlist">Waitlist</a>
          </nav>
          <a href="#waitlist" className="btn btn-outline">Join Waitlist</a>
        </header>

        <section className="hero card">
          <div>
            <p className="chip">Built for the agent economy</p>
            <h1>Readable books for the agent economy.</h1>
            <p className="subtext">
              x402Books AI turns Base USDC microtransactions into clean reports, spend categories,
              and agent-readable financial summaries.
            </p>
            <div className="actions">
              <a href="#waitlist" className="btn btn-primary">Join Waitlist</a>
              <a href="#sample" className="btn btn-ghost">View Sample Report</a>
            </div>
          </div>
          <aside className="mock">
            <div className="mock-card">
              <p>Total Spend</p><strong>$42.80</strong>
            </div>
            <div className="mock-card">
              <p>Total Income</p><strong>$91.20</strong>
            </div>
            <div className="mock-card">
              <p>Net Flow</p><strong>+$48.40</strong>
            </div>
            <div className="mock-card">
              <p>Likely x402</p><strong>128</strong>
            </div>
          </aside>
        </section>

        <section id="features" className="grid-3">
          {features.map((item) => (
            <article className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section id="how" className="card stack">
          <h2>How it works</h2>
          <p className="section-sub">Simple flow. Clean output. Built for speed and clarity.</p>
          <div className="grid-3">
            {how.map(([title, body], i) => (
              <article className="step" key={title}>
                <span>Step {i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="sample" className="card stack">
          <h2>Sample transaction output</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Amount</th><th>Direction</th></tr></thead>
              <tbody>
                <tr><td>API call</td><td>0.42 USDC</td><td>Expense</td></tr>
                <tr><td>Data access</td><td>1.20 USDC</td><td>Expense</td></tr>
                <tr><td>Agent service</td><td>12.80 USDC</td><td>Income</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="waitlist" className="card stack">
          <h2>Join the first wave of agent accounting.</h2>
          <p className="section-sub">Get early access to wallet scans, categorized reports, and the x402Books API.</p>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
