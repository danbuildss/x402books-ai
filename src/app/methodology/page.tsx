import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trust Score Methodology — x402Books",
  description:
    "How x402Books computes trust scores, confidence, risk levels, and recommendations for autonomous agents. Published methodology, versioned, matching the shipped scoring code.",
};

// This page documents the ACTUAL scoring logic in src/lib/kya.ts.
// If the code changes, this page changes in the same PR — a published
// methodology that doesn't match the model is worse than no methodology.

export default function MethodologyPage() {
  return (
    <div className="docs-root">
      <header className="docs-header">
        <div className="docs-header-inner">
          <div className="docs-header-left">
            <span className="docs-header-title">Trust Score Methodology</span>
          </div>
          <div className="docs-header-right">
            <div className="docs-version-pill">Methodology v1 · June 2026</div>
            <Link href="/docs" className="docs-back-link">← Docs</Link>
            <Link href="/registry" className="docs-open-btn">Registry</Link>
          </div>
        </div>
      </header>

      <div className="docs-layout" style={{ maxWidth: 860, margin: "0 auto" }}>
        <main className="docs-content" style={{ width: "100%" }}>

          <section className="docs-section">
            <span className="docs-tag">Methodology v1</span>
            <h1 className="docs-h1">How trust scores are computed</h1>
            <p className="docs-lead">
              Every number the Trust Check API returns is explained on this page. The scoring is deterministic, versioned, and this document matches the shipped code.
            </p>

            <div className="docs-callout">
              <strong>Two numbers, on purpose.</strong> <code>trust_score</code> is how good an agent looks based on what we know. <code>confidence</code> is how much we actually know. They are never collapsed into one number — a high score built on thin evidence is a different thing than a high score built on verified history, and hiding that difference is how rating systems mislead.
            </div>

            <h2 className="docs-h2">Reading the two numbers together</h2>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Example</span></div>
              <pre>{`Agent A: { "trust_score": 88, "confidence": 23 }
→ looks good, but newly indexed, few wallets declared, little history.

Agent B: { "trust_score": 81, "confidence": 94 }
→ slightly lower score, but verified, manifest declared, claim
  approved, behavioral history on record.

Most serious systems should prefer Agent B.`}</pre>
            </div>
          </section>

          <section className="docs-section">
            <h1 className="docs-h1">trust_score (0–100)</h1>
            <p className="docs-p">
              Four factors, summed and capped at 100. Verification status dominates by design: it is the signal we can most strongly stand behind, because it requires either a public manifest, a matching wallet, or direct review.
            </p>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>Factor 1 — Verification status (up to 70 points)</span></div>
              <pre>{`Luca Managed        70   finances actively monitored
Verified            65   passed Luca review
Claimed             50   team claimed profile, wallet matched
Wallets Declared    35   manifest validated
Candidate           10   indexed from public data, no proof
Needs Verification   5   flagged state — scores BELOW Candidate`}</pre>
            </div>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>Factor 2 — Declared wallet roles (up to 12 points)</span></div>
              <pre>{`+4 per distinct declared role (treasury, fee, deployer,
operator), capped at 12. Roles come from the agent's
.agent/wallets.json manifest — undeclared roles score 0.`}</pre>
            </div>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>Factor 3 — Treasury health (up to 8 points)</span></div>
              <pre>{`Healthy  +8 · Stable  +6 · Watch  +2 · At Risk / Pending  +0`}</pre>
            </div>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>Factor 4 — Financial activity (up to 10 points)</span></div>
              <pre>{`Luca's financial activity score (0–100), divided by 10.
No activity review on record → 0 points.`}</pre>
            </div>
          </section>

          <section className="docs-section">
            <h1 className="docs-h1">confidence (0–100)</h1>
            <p className="docs-p">
              Confidence measures evidence, not quality. Each independent data source adds points. An agent can only raise its confidence by giving the registry more verifiable data.
            </p>
            <div className="docs-code-block">
              <div className="docs-code-head"><span>Evidence inputs</span></div>
              <pre>{`+25  wallets declared via manifest
+15  ownership proof (Claimed or above)
+15  Luca financial review on record
+10  data freshness (checked within 30 days)
+10  two or more evidence sources
+10  Luca verdict on record
+15  behavioral history (tool decision events indexed)
────
 100  maximum`}</pre>
            </div>
          </section>

          <section className="docs-section">
            <h1 className="docs-h1">risk_level and recommendation</h1>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>risk_level</span></div>
              <pre>{`HIGH    treasury At Risk, OR unverified with no wallets declared
LOW     Claimed or above, OR Wallets Declared with healthy/stable treasury
MEDIUM  everything else`}</pre>
            </div>

            <div className="docs-code-block">
              <div className="docs-code-head"><span>recommendation</span></div>
              <pre>{`BLOCK   only on explicit negative signals
        (At Risk treasury + unverified)
REVIEW  flagged agents, and any agent with thin evidence
ALLOW   Verified or above, OR Wallets Declared+ with
        LOW risk and confidence ≥ 50`}</pre>
            </div>

            <div className="docs-callout docs-callout-green">
              <strong>Absence of data is never BLOCK.</strong> An agent that hasn&apos;t been indexed or hasn&apos;t declared wallets gets REVIEW, not BLOCK. We do not punish agents for not knowing about us — BLOCK is reserved for affirmative negative evidence.
            </div>
          </section>

          <section className="docs-section">
            <h1 className="docs-h1">How to improve your scores</h1>
            <ul className="docs-list">
              <li><strong>Declare wallets</strong> — add <code>.agent/wallets.json</code> to your repo with roles. Largest single trust_score and confidence gain available.</li>
              <li><strong>Claim your profile</strong> — submit a wallet matching your manifest. Moves you to Claimed (+15 trust, +15 confidence).</li>
              <li><strong>Get verified</strong> — Luca review of your declared wallets and activity.</li>
              <li><strong>Stay active and consistent</strong> — treasury health and activity scores update as Luca re-checks the registry.</li>
            </ul>
          </section>

          <section className="docs-section docs-section-last">
            <h1 className="docs-h1">What this is — and is not</h1>
            <p className="docs-p">
              Trust Check output is an <strong>advisory risk signal</strong> computed from registry data: manifests, claims, verification reviews, onchain activity, and behavioral history. It is not financial advice, not a credit rating, and not a guarantee of conduct. The caller makes the decision.
            </p>
            <p className="docs-p">
              Scoring is versioned. Changes to factors or weights are shipped with a version bump on this page and noted in the changelog. Current version: <strong>v1 (June 2026)</strong>.
            </p>
            <div className="docs-callout">
              <strong>Try it:</strong> <code>GET /api/v1/kya/[agent-slug]</code> with an API key from <Link href="/developer" style={{ color: "var(--accent)" }}>/developer</Link>. Full schema in the <Link href="/docs" style={{ color: "var(--accent)" }}>API reference</Link>.
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
