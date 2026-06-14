import { NextResponse } from "next/server";
import { getAgentGDP } from "@/lib/agent-gdp";

export const revalidate = 3600;

export async function GET() {
  try {
    const gdp = await getAgentGDP();
    const bySlug: Record<string, typeof gdp.all_attributed[0]> = {};
    for (const entry of gdp.all_attributed) {
      bySlug[entry.slug] = entry;
    }
    return NextResponse.json({ ok: true, economics: bySlug });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
