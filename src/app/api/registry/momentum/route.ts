import { NextResponse } from "next/server";
import { getFirstLastSnapshotsPerAgent } from "@/lib/agent-books-history";
import { computeMomentumFromPair } from "@/lib/agent-momentum";
import type { AgentMomentum } from "@/lib/agent-momentum";

export const revalidate = 300;

export async function GET() {
  try {
    const snapshotPairs = await getFirstLastSnapshotsPerAgent(30).catch(() => ({}));
    const momentum: Record<string, AgentMomentum> = {};
    for (const [slug, { first, last, count }] of Object.entries(snapshotPairs)) {
      const m = computeMomentumFromPair(first, last, count, 30);
      if (m) momentum[slug] = m;
    }
    return NextResponse.json({ ok: true, momentum });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
