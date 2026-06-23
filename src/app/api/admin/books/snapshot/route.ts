// POST /api/admin/books/snapshot — trigger agent books snapshots.
//
// Accepts optional { slug } in body:
//   - If slug is provided: snapshot just that agent.
//   - If slug is omitted: snapshot all attributed agents.
//
// Auth: internalAuth (X402BOOKS_INTERNAL_SECRET)
// Runs sequentially to avoid rate-limiting downstream ledger calls.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks, invalidateAllBooksCache } from "@/lib/agent-books";
import { saveAgentBooksSnapshot } from "@/lib/agent-books-history";
import { toSlug } from "@/app/registry/[slug]/slug";
import { invalidateGdpCache } from "@/lib/agent-gdp";

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { slug?: string };
  const targetSlug = body.slug?.trim() || null;

  const { agents } = await getRegistryAgents();

  // Filter to attributed agents (those with declared wallets)
  const candidateAgents = agents.filter((a) => (a.wallets ?? []).length > 0);

  // If a specific slug was requested, narrow to just that agent
  const toSnapshot = targetSlug
    ? candidateAgents.filter((a) => toSlug(a.name) === targetSlug)
    : candidateAgents;

  if (targetSlug && toSnapshot.length === 0) {
    return NextResponse.json(
      { ok: false, error: `No attributed agent found with slug '${targetSlug}'.` },
      { status: 404 },
    );
  }

  let snapshotted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Run sequentially to avoid rate-limiting ledger calls
  for (const agent of toSnapshot) {
    const slug = toSlug(agent.name);
    try {
      const books = await buildAgentBooks(agent, "30d");

      if (!books.attributed) {
        skipped++;
        continue;
      }

      await saveAgentBooksSnapshot(books);
      snapshotted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${slug}: ${msg}`);
    }
  }

  return NextResponse.json({
    ok: true,
    snapshotted,
    skipped,
    errors,
  });
}

export async function DELETE(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();

  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug query param required" }, { status: 400 });
  }

  await invalidateAllBooksCache(slug);
  // Also reset GDP in-memory cache so the old figure doesn't linger there
  invalidateGdpCache();
  return NextResponse.json({ ok: true, slug, message: `Books cache purged for ${slug}. Next request will trigger fresh computation.` });
}
