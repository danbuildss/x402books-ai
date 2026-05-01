import { WaitlistForm } from "@/lib/waitlist-form";

const steps = [
  { title: "Paste a wallet", body: "Scan any Base wallet or agent address." },
  { title: "Analyze USDC activity", body: "We detect likely x402-style payments and microtransactions." },
  { title: "Generate clean books", body: "Get spend, income, categories, CSV exports, and reports." },
];

const metrics = [
  { label: "Total Spend", value: "$42.80" },
  { label: "Total Income", value: "$91.20" },
  { label: "Net Flow", value: "+$48.40" },
  { label: "Likely x402 Payments", value: "128" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <section className="space-y-8">
          <p className="inline-flex rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-teal-300">x402Books AI</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">Readable books for the agent economy.</h1>
          <p className="max-w-3xl text-lg text-slate-300">x402Books AI turns Base USDC microtransactions into clean reports, spend categories, and agent-readable financial summaries.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#waitlist" className="rounded-xl bg-teal-400 px-5 py-3 font-medium text-slate-950 hover:bg-teal-300">Join Waitlist</a>
            <a href="#sample" className="rounded-xl border border-slate-700 px-5 py-3 font-medium hover:border-slate-500">View Sample Report</a>
          </div>
        </section>

        <section className="mt-20 grid gap-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 md:grid-cols-2">
          <h2 className="text-2xl font-semibold">Agents are spending money. Nobody is tracking it properly.</h2>
          <p className="text-slate-300">AI agents are starting to pay for APIs, data, compute, and services through x402 payments. But most of this activity still looks like raw wallet transactions. x402Books makes it readable.</p>
        </section>

        <section className="mt-20">
          <h3 className="text-2xl font-semibold">How it works</h3>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, idx) => (
              <article key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <p className="text-sm text-teal-300">Step {idx + 1}</p>
                <h4 className="mt-2 text-lg font-medium">{step.title}</h4>
                <p className="mt-2 text-slate-300">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="sample" className="mt-20 rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-2xl font-semibold">Product Preview</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-teal-300">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-300"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th></tr></thead>
              <tbody>
                <tr className="border-t border-slate-800"><td className="px-4 py-3">API call</td><td className="px-4 py-3">0.42 USDC</td></tr>
                <tr className="border-t border-slate-800"><td className="px-4 py-3">Data access</td><td className="px-4 py-3">1.20 USDC</td></tr>
                <tr className="border-t border-slate-800"><td className="px-4 py-3">Agent service income</td><td className="px-4 py-3">12.80 USDC</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            ["For builders", "Track agent spend and API usage."],
            ["For teams", "Monitor multiple wallets and service costs."],
            ["For agents", "Query budgets, reports, and spending limits through API."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"><h4 className="text-lg font-medium">{title}</h4><p className="mt-2 text-slate-300">{body}</p></article>
          ))}
        </section>

        <section id="waitlist" className="mt-20 rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-2xl font-semibold">Join the first wave of agent accounting.</h3>
          <p className="mt-2 max-w-2xl text-slate-300">Get early access to wallet scans, AI-categorized reports, and the x402Books agent API.</p>
          <div className="mt-6"><WaitlistForm /></div>
        </section>
      </div>
    </main>
  );
}
