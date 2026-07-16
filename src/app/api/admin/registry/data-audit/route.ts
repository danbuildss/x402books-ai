import { NextRequest, NextResponse } from "next/server";
import { internalAuth as authOk } from "@/lib/internal-auth";
import { buildBankrDataAudit } from "@/lib/bankr-audit";
import { renderBankrAuditMarkdown } from "@/lib/bankr-audit-markdown";

// GET /api/admin/registry/data-audit[?format=json|md]
//
// Bankr agent data-quality audit: per-agent field checks + aggregate counts.
// Read-only, no side effects — safe to call at any frequency. Weekly rerun
// is wired via scripts/bankr-data-audit.sh (archives dated artifacts) and
// the Hermes scheduler (see skills/zetta/bankr-data-audit/SKILL.md;
// suggested cron: Mondays 06:00 UTC).
//
// Serverless note: this route must NEVER write files — the Vercel runtime
// filesystem is ephemeral. Artifact writing lives in the shell script only.
export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  try {
    const audit = await buildBankrDataAudit();
    if (format === "md") {
      return new NextResponse(renderBankrAuditMarkdown(audit), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }
    return NextResponse.json({ ok: true, ...audit });
  } catch (err) {
    console.error("[api/admin/registry/data-audit] error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
