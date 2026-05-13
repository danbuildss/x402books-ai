import { NextResponse } from "next/server";
import { searchAgents } from "@/lib/agent-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchAgents(query);
  return NextResponse.json({ results });
}
