import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";
import {
  BANKR_PRIORITIES,
  FOCUS_STATUSES,
  METADATA_STATUSES,
  type BankrPriority,
  type FocusStatus,
  type MetadataStatus,
} from "@/app/registry/types";

// PATCH /api/admin/registry/update-agent
// Body: { name: string; xHandle?: string; website?: string; symbol?: string;
//         focusStatus?: string | null; bankrPriority?: string | null;
//         metadataStatus?: string | null }
// Updates profile metadata + admin-edited P0 tags for an agent.
// wallet_status / profile_status are trigger-owned and outreach_status has
// its own endpoint — none of them are accepted here.
// Admin-authenticated only.
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: {
    name?: string; xHandle?: string; website?: string; symbol?: string;
    focusStatus?: string | null; bankrPriority?: string | null; metadataStatus?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if ("xHandle" in body) updates.x_handle = body.xHandle?.trim() || null;
  if ("website" in body) updates.website = body.website?.trim() || null;
  if ("symbol" in body) updates.symbol = body.symbol?.trim() || null;

  // P0 tag fields: null clears the tag; non-null values must be in-vocabulary
  // (the DB CHECK constraints would reject them anyway — fail fast with a 400).
  const tagFields = [
    { key: "focusStatus" as const, column: "focus_status", allowed: FOCUS_STATUSES as readonly string[] },
    { key: "bankrPriority" as const, column: "bankr_priority", allowed: BANKR_PRIORITIES as readonly string[] },
    { key: "metadataStatus" as const, column: "metadata_status", allowed: METADATA_STATUSES as readonly string[] },
  ];
  for (const { key, column, allowed } of tagFields) {
    if (!(key in body)) continue;
    const value = body[key] as FocusStatus | BankrPriority | MetadataStatus | null | undefined;
    if (value != null && !allowed.includes(value)) {
      return NextResponse.json(
        { ok: false, error: `${key} must be null or one of: ${allowed.join(", ")}` },
        { status: 400 },
      );
    }
    updates[column] = value ?? null;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_agents")
    .update(updates)
    .eq("name", name)
    .select("name");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: `Agent "${name}" not found` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, name, updated: updates });
}
