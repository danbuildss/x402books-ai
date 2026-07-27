import { LedgerCard, LedgerRow } from "@/components/ui/ledger";

export default function BillingPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Billing</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink-em)", margin: 0 }}>Plan & Usage</h1>
      </div>

      <LedgerCard eyebrow="Current Plan" title="Free Tier">
        <LedgerRow label="Plan" value="Free" />
        <LedgerRow label="API rate limit" value="20 req/min" />
        <LedgerRow label="Daily quota" value="500 requests" />
        <LedgerRow last label="Upgrade" value={
          <a href="mailto:dan@zettaai.co" style={{ color: "var(--accent)", fontSize: "0.78rem" }}>
            dan@zettaai.co →
          </a>
        } detail="Contact us for Builder, Pro, or Enterprise access" />
      </LedgerCard>
    </div>
  );
}
