// GET /api/cron/weekly-digest
// Monday morning cron — generates weekly financial digest for all active agents.
// Called by Luca (Hermes VPS scheduler). Protected by CRON_SECRET header.
// Suggested schedule: Mondays at 08:00 UTC.

import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyDigest, formatDigestText } from "@/lib/digest-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const start = Date.now();

  try {
    const digest = await generateWeeklyDigest();
    const text = formatDigestText(digest);

    // TODO: pipe `text` to Telegram / email / in-app notification when those
    //       integrations are wired up. For now, log to Vercel and return the
    //       digest body so it can be inspected in cron run history.
    console.log("[weekly-digest]", text);

    return NextResponse.json({
      ok: true,
      entries: digest.entries.length,
      skipped: digest.skipped,
      duration_ms: Date.now() - start,
      digest: text,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Digest generation failed.", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
