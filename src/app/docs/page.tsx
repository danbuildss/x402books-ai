import Link from "next/link";
import { Logo } from "@/components/logo";

export default function DocsPage() {
  return (
    <main className="pub-report-page">
      <header className="pub-report-header">
        <a href="/" className="pub-report-brand">
          <Logo />
        </a>
      </header>
      <div className="pub-report-body">
        <div className="pub-report-hero" style={{ maxWidth: "560px" }}>
          <div>
            <p className="pub-report-label">Documentation</p>
            <h1>Docs coming soon.</h1>
            <p className="pub-report-narrative">
              Full API reference, agent JSON schema, and integration guides are being prepared. Drop by on X or Telegram for early access.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer" className="pub-report-btn primary">
              @x402Books on X
            </a>
            <Link href="/" className="pub-report-btn">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
