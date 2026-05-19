import { NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";

export async function GET() {
  try {
    const { agents, fromSupabase } = await getRegistryAgents();
    return NextResponse.json(
      { agents, fromSupabase },
      {
        headers: {
          // Allow short-term caching — registry data changes infrequently
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("[api/registry/agents] error:", err);
    return NextResponse.json({ agents: [], fromSupabase: false }, { status: 500 });
  }
}
