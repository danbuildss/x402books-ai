// GET /api/cron/refresh-books — refresh books for all attributed agents.
//
// Called by Hermes (external scheduler) via x-internal-secret header.
// Also callable manually for testing with the same header.
//
// For each agent with declared wallets:
//   1. Invalidates the in-memory cache entry so the next build triggers a fresh scan
//   2. Calls buildAgentBooks() — which will run a live Alchemy scan and write to DB cache
//   3. Saves a books snapshot for historical trending

import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, invalidateBooksCache } from "@/lib/agent-books";
import { saveAgentBooksSnapshot } from "@/lib/agent-books-history";
import { internalAuth } from "@/lib/internal-auth";
import { toSlug } from "@/app/registry/[slug]/slug";

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { agents } = await getRegistryAgents();
  const attributed = agents.filter((a) => (a.wallets ?? []).length > 0);

  let refreshed = 0;
  let errors = 0;

  for (const agent of attributed) {
    const slug = toSlug(agent.name);
    try {
      // Clear in-memory cache so buildAgentBooks() runs a fresh Alchemy scan
      invalidateBooksCache(slug, "30d");
      // Build fresh books (will update DB cache automatically)
      const books = await buildAgentBooks(agent, "30d");
      if (books.attributed) {
        await saveAgentBooksSnapshot(books).catch(() => {});
      }
      refreshed++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    refreshed,
    errors,
    total: attributed.length,
    timestamp: new Date().toISOString(),
  });
}
