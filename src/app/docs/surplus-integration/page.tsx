import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Surplus Integration Guide | Zetta",
  description: "Route your agent's inference spend through Zetta. Inference costs appear on your agent's public financial profile — attributed, classified, and readable.",
};

const CODE_PROXY = `// Replace your existing inference call with the Zetta proxy.
// Drop-in replacement — same request shape as OpenAI chat completions.

const response = await fetch(
  "https://www.zettaai.co/api/inference/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer zt_live_YOUR_KEY_HERE",
      "Content-Type": "application/json",
      // Tells Zetta which agent this spend belongs to
      "X-Agent-Id":   "your-agent-slug",
      "X-Agent-Name": "Your Agent Name",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b",   // or claude-sonnet-4-6, gpt-4o, etc.
      messages: [
        { role: "user", content: "Hello" }
      ],
      stream: false,
    }),
  }
);

const data = await response.json();
// Response is identical to a direct Surplus/OpenAI response.
// Zetta logs the spend to your agent's profile in the background.`;

const CODE_WEBHOOK = `// If you prefer to call Surplus directly and notify Zetta afterwards,
// configure Surplus to POST to this webhook after each settled inference job.
//
// In your Surplus dashboard:
//   Webhook URL:    https://www.zettaai.co/api/v1/luca/surplus/webhook
//   Webhook Secret: your SURPLUS_WEBHOOK_SECRET value

// Surplus will POST this shape after each completed inference:
{
  "event":      "inference.completed",
  "agent_id":   "your-agent-slug",
  "model":      "llama-3.3-70b",
  "usage":      { "prompt_tokens": 120, "completion_tokens": 80 },
  "cost_usd":   0.000118,
  "latency_ms": 340,
  "request_id": "req_abc123"
}`;

const CODE_VERIFY = `// Verify the integration is working — your spend should appear here:
curl https://www.zettaai.co/registry/your-agent-slug

// Or query it directly from the API:
curl -H "Authorization: Bearer zt_live_YOUR_KEY_HERE" \\
  "https://www.zettaai.co/api/v1/agent-books/your-agent-slug"

// You should see inference_spend in the financials after the first request.`;

function CodeBlock({ code, lang = "typescript" }: { code: string; lang?: string }) {
  return (
    <pre style={{
      background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10,
      padding: "18px 20px", overflowX: "auto", fontSize: "0.78rem", lineHeight: 1.65,
      fontFamily: "monospace", color: "var(--ink)", margin: 0,
    }}>
      <code>{code}</code>
    </pre>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", background: "var(--accent)", color: "#fff",
          fontSize: "0.78rem", fontWeight: 800, flexShrink: 0,
        }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SurplusIntegrationPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/docs" style={{ color: "var(--accent)", textDecoration: "none" }}>Docs</Link>
        {" / "}Surplus Integration
      </p>

      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
          Integration Guide
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
          Zetta × Surplus
        </h1>
        <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: 600 }}>
          Route your agent&apos;s inference spend through Zetta and it appears on your
          public financial profile — attributed, classified, and readable. Two steps.
          No new SDK required.
        </p>
      </div>

      {/* What you get */}
      <section style={{ marginBottom: 48, padding: "20px 24px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 16, color: "var(--muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          What integration gives you
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { icon: "◎", title: "Live inference spend", body: "Costs appear on your Zetta profile in real time — model, provider, USD amount." },
            { icon: "◈", title: "Attributed expenses", body: "Inference spend is classified as an operational expense in your agent's books." },
            { icon: "◇", title: "Public financial identity", body: "Your profile shows revenue, expenses including inference, and net income side by side." },
            { icon: "◆", title: "Luca reads it", body: "Ask Luca 'what did my agent spend on inference this month?' and get a real answer." },
          ].map((item) => (
            <div key={item.title} style={{ padding: "14px 16px", borderRadius: 8, border: "1px solid var(--line)" }}>
              <p style={{ margin: "0 0 6px", fontSize: "1rem" }}>{item.icon}</p>
              <p style={{ margin: "0 0 4px", fontSize: "0.8rem", fontWeight: 700 }}>{item.title}</p>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Option A — Proxy */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: "var(--accent)15", border: "1px solid var(--accent)40", color: "var(--accent)", letterSpacing: "0.04em" }}>
            OPTION A — RECOMMENDED
          </span>
        </div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 6 }}>Inference proxy</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 24, maxWidth: 580 }}>
          Point your inference calls at the Zetta proxy instead of Surplus directly.
          Zetta forwards the request, returns the response unchanged, and logs the spend to your profile in the background.
          Zero latency overhead. Drop-in replacement.
        </p>

        <Step n="1" title="Get a Zetta API key">
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
            Sign in to the <Link href="/dashboard/developer" style={{ color: "var(--accent)", textDecoration: "none" }}>developer portal</Link> and
            create a new key. Your key prefix looks like <code style={{ fontFamily: "monospace", background: "var(--surface-soft)", padding: "1px 6px", borderRadius: 4, fontSize: "0.8rem" }}>zt_live_</code>.
            You&apos;ll need this in the next step.
          </p>
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--surface-soft)", border: "1px solid var(--line)", fontSize: "0.8rem", color: "var(--muted)" }}>
            Your agent&apos;s slug is the URL-safe version of its registry name —
            e.g. <code style={{ fontFamily: "monospace" }}>aeon</code> for <strong style={{ color: "var(--ink)" }}>AEON</strong>.
            Find it at <code style={{ fontFamily: "monospace" }}>zettaai.co/registry/your-agent-slug</code>.
          </div>
        </Step>

        <Step n="2" title="Replace your inference endpoint">
          <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 14 }}>
            Change one URL and add two headers. The request body stays identical.
          </p>
          <CodeBlock code={CODE_PROXY} />
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginTop: 12 }}>
            Supported models: <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>llama-3.3-70b</code>,{" "}
            <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>claude-sonnet-4-6</code>,{" "}
            <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>claude-haiku-4-5</code>,{" "}
            <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>gpt-4o</code>,{" "}
            <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>gpt-4o-mini</code> — and anything else Surplus supports.
          </p>
        </Step>

        <Step n="3" title="Verify on your profile">
          <CodeBlock code={CODE_VERIFY} lang="bash" />
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginTop: 12 }}>
            Inference spend appears under <strong>Agent Books → Expenses</strong> and in the
            <strong> Inference Activity</strong> card within a few seconds of your first request.
          </p>
        </Step>
      </div>

      {/* Option B — Webhook */}
      <div style={{ marginBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: "var(--surface-soft)", border: "1px solid var(--line)", color: "var(--muted)", letterSpacing: "0.04em" }}>
            OPTION B — DIRECT SURPLUS
          </span>
        </div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 6 }}>Surplus webhook</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 24, maxWidth: 580 }}>
          If you call Surplus directly and prefer to keep that flow, register the Zetta webhook
          in your Surplus dashboard. Surplus POSTs spend events to Zetta after each job settles.
        </p>
        <CodeBlock code={CODE_WEBHOOK} lang="json" />
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55, marginTop: 14 }}>
          Contact <a href="mailto:dan@zettaai.co" style={{ color: "var(--accent)" }}>dan@zettaai.co</a> to
          get a <code style={{ fontFamily: "monospace", fontSize: "0.76rem" }}>SURPLUS_WEBHOOK_SECRET</code> configured for your project.
        </p>
      </div>

      {/* FAQ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 20 }}>Common questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              q: "Does the proxy add latency?",
              a: "No measurable latency. The proxy forwards your request to Surplus and streams the response back. Logging happens asynchronously after the response is delivered.",
            },
            {
              q: "Do you store my prompts or completions?",
              a: "No. Zetta only logs metadata: model, agent ID, token count, cost, and latency. The content of your requests and responses is never stored.",
            },
            {
              q: "What if the proxy goes down?",
              a: "You can fall back to calling Surplus directly using the same API key. The proxy is stateless — no data is held there. Spend won't be logged during downtime but the integration resumes automatically.",
            },
            {
              q: "Does my agent need to be verified on Zetta?",
              a: "No verification required to start logging inference spend. A basic registry entry is enough. Verification is a separate process that unlocks the higher-confidence financial profile tier.",
            },
            {
              q: "Can I attribute spend to multiple agents from one service?",
              a: "Yes. Pass a different X-Agent-Id header per request. Each agent's spend is logged separately and appears on their individual profile.",
            },
          ].map(({ q, a }) => (
            <div key={q} style={{ paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>{q}</p>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "24px 28px", borderRadius: 12, border: "1px solid var(--accent)40", background: "var(--accent)08" }}>
        <p style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 8 }}>Ready to integrate?</p>
        <p style={{ fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: 20 }}>
          Get your API key in the developer portal and your first inference spend appears on your profile within seconds.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard/developer" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--accent)", color: "#fff", fontWeight: 700,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 8,
            textDecoration: "none",
          }}>
            Get API key →
          </Link>
          <a href="mailto:dan@zettaai.co" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1px solid var(--line)", color: "var(--ink)", fontWeight: 600,
            fontSize: "0.84rem", padding: "10px 20px", borderRadius: 8,
            textDecoration: "none",
          }}>
            Talk to us
          </a>
        </div>
      </section>
    </main>
  );
}
