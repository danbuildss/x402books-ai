import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HomeHeader } from "@/app/home-header";
import { getReportBySlug, listReports } from "@/lib/research-db";
import { INAUGURAL_REPORT } from "@/lib/inaugural-report";

export const revalidate = 3600;

export async function generateStaticParams() {
  const reports = await listReports(50);
  const slugs = new Set(reports.map((r) => r.slug));
  slugs.add(INAUGURAL_REPORT.slug);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) return { title: "Report not found — Zetta" };

  const ogUrl = new URL("https://www.zettaai.co/api/og/report");
  ogUrl.searchParams.set("title", report.title);
  if (report.summary) ogUrl.searchParams.set("summary", report.summary.slice(0, 200));
  if (report.agent_gdp_usd != null) ogUrl.searchParams.set("gdp", String(report.agent_gdp_usd));
  if (report.attributed_agents != null) ogUrl.searchParams.set("agents", String(report.attributed_agents));
  ogUrl.searchParams.set("type", report.type);

  const desc = report.summary?.slice(0, 160) ?? `${report.title} — State of the Agent Economy by Luca`;

  return {
    title: `${report.title} — Zetta Research`,
    description: desc,
    openGraph: {
      title: report.title,
      description: desc,
      url: `https://www.zettaai.co/research/${slug}`,
      siteName: "Zetta",
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: report.title,
      description: desc,
      images: [ogUrl.toString()],
    },
  };
}

function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = (await getReportBySlug(slug)) ?? (slug === INAUGURAL_REPORT.slug ? INAUGURAL_REPORT : null);
  if (!report) notFound();

  const paragraphs = report.body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="lp-root">
      <HomeHeader />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 24px 6rem" }}>

        {/* Breadcrumb */}
        <nav style={{ marginBottom: 32, fontSize: "0.78rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Zetta</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/research" style={{ color: "var(--muted)", textDecoration: "none" }}>Research</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>{report.period_label ?? report.type}</span>
        </nav>

        {/* Type badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: "0.67rem", fontWeight: 600, padding: "3px 10px", borderRadius: 99, border: "1px solid var(--line)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {report.type} report
          </span>
        </div>

        {/* Title */}
        <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.5rem, 4vw, 2.1rem)", fontWeight: 800, lineHeight: 1.2 }}>
          {report.title}
        </h1>

        {/* Byline */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "16px 0 32px", fontSize: "0.8rem", color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: "var(--fg)" }}>By Luca</span>
          <span>·</span>
          <span>Zetta Financial Intelligence</span>
          <span>·</span>
          <time dateTime={report.published_at}>{fmtDate(report.published_at)}</time>
        </div>

        {/* GDP summary bar */}
        {report.agent_gdp_usd != null && (
          <div style={{
            padding: "16px 20px",
            background: "var(--surface-soft)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            marginBottom: 36,
            display: "flex",
            gap: 36,
            flexWrap: "wrap",
          }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600 }}>Agent GDP (30d)</p>
              <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, fontFamily: "monospace", color: "#6DB874" }}>{fmtUSD(report.agent_gdp_usd)}</p>
            </div>
            {report.attributed_agents != null && (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 600 }}>Attributed Agents</p>
                <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, fontFamily: "monospace" }}>{report.attributed_agents}</p>
              </div>
            )}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 36px" }} />

        {/* Summary / lede */}
        <p style={{ margin: "0 0 28px", fontSize: "1.05rem", fontWeight: 600, lineHeight: 1.6, color: "var(--fg)" }}>
          {report.summary}
        </p>

        {/* Body */}
        <div style={{ lineHeight: 1.78, fontSize: "0.95rem", color: "var(--fg)" }}>
          {paragraphs.map((para, i) => (
            <p key={i} style={{ marginBottom: "1.4em" }}>{para}</p>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid var(--line)", fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.6 }}>
          This report was generated by Luca, Zetta&rsquo; financial analyst, using on-chain data from declared wallet manifests. Only agents with attributed wallets are included. Numbers reflect confirmed on-chain activity only. This is not financial advice.
        </div>

        {/* Navigation */}
        <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/research" className="lp-btn-ghost">← All Reports</Link>
          <Link href="/registry" className="lp-btn-primary">Browse Agent Books →</Link>
        </div>
      </article>
    </div>
  );
}
