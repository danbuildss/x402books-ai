import { NextRequest, NextResponse } from "next/server";
import { insertPendingUpdates, type PendingUpdateInput } from "@/lib/registry-db";
import { internalAuth } from "@/lib/internal-auth";

const VALID_UPDATE_TYPES = ["new_agent", "score_update", "wallet_update", "status_change"] as const;

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("updates" in body) ||
    !Array.isArray((body as { updates: unknown }).updates)
  ) {
    return NextResponse.json(
      { ok: false, error: "Body must be { updates: [...] }" },
      { status: 400 }
    );
  }

  const rawUpdates = (body as { updates: unknown[] }).updates;

  // ── Validate each update ──────────────────────────────────────────────────
  const updates: PendingUpdateInput[] = [];

  for (let i = 0; i < rawUpdates.length; i++) {
    const u = rawUpdates[i];
    if (typeof u !== "object" || u === null) {
      return NextResponse.json(
        { ok: false, error: `updates[${i}] must be an object` },
        { status: 400 }
      );
    }

    const item = u as Record<string, unknown>;

    if (typeof item.agent_name !== "string" || !item.agent_name.trim()) {
      return NextResponse.json(
        { ok: false, error: `updates[${i}].agent_name is required` },
        { status: 400 }
      );
    }

    if (!VALID_UPDATE_TYPES.includes(item.update_type as (typeof VALID_UPDATE_TYPES)[number])) {
      return NextResponse.json(
        {
          ok: false,
          error: `updates[${i}].update_type must be one of: ${VALID_UPDATE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (typeof item.proposed_data !== "object" || item.proposed_data === null) {
      return NextResponse.json(
        { ok: false, error: `updates[${i}].proposed_data must be an object` },
        { status: 400 }
      );
    }

    updates.push({
      agent_name: String(item.agent_name).trim(),
      update_type: item.update_type as PendingUpdateInput["update_type"],
      proposed_data: item.proposed_data as Record<string, unknown>,
      diff_summary: typeof item.diff_summary === "string" ? item.diff_summary : undefined,
      luca_notes: typeof item.luca_notes === "string" ? item.luca_notes : undefined,
    });
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided" }, { status: 400 });
  }

  // ── Insert to Supabase ────────────────────────────────────────────────────
  const result = await insertPendingUpdates(updates);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: result.inserted });
}
