import { NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { toPublicAgent } from "@/app/registry/types";
import { scopeAgents } from "@/lib/focus";

// Public endpoint: returns PublicAgent only (internal CRM fields stripped)
// and respects the BANKR_ONLY scope lock. Admin tooling uses
// /api/admin/registry/agents for the full, unscoped payload.
export async function GET() {
  try {
    const { agents, fromSupabase } = await getRegistryAgents();
    const publicAgents = scopeAgents(agents).map(toPublicAgent);
    return NextResponse.json(
      { agents: publicAgents, fromSupabase },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (err) {
    console.error("[api/registry/agents] error:", err);
    return NextResponse.json({ agents: [], fromSupabase: false }, { status: 500 });
  }
}
