import { NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";

export async function GET() {
  try {
    const { agents, fromSupabase } = await getRegistryAgents();
    return NextResponse.json(
      { agents, fromSupabase },
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
