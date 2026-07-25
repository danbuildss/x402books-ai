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

const ECOSYSTEMS = ["BANKR", "Virtuals", "Base", "AEON", "EigenCloud"] as const;
const VERIFICATION_STATUSES = [
  "Candidate", "Needs Verification", "Wallets Declared", "Claimed",
  "Verified", "Luca Managed", "ERC-8004 Indexed", "Awaiting Manifest",
] as const;
const TREASURY_HEALTH_VALUES = ["Active", "Inactive", "Unverified", "Pending", "Stable"] as const;

// PATCH /api/admin/registry/update-agent
// Body: { name: string; xHandle?: string; website?: string; symbol?: string;
//         bio?: string | null; ecosystem?: string; verificationStatus?: string;
//         treasuryHealth?: string; priority?: number; pfp?: string | null;
//         gitlawbRepo?: string | null; evidenceSources?: string[];
//         adminNotes?: string | null;
//         focusStatus?: string | null; bankrPriority?: string | null;
//         metadataStatus?: string | null }
// wallet_status / profile_status are trigger-owned and outreach_status has
// its own endpoint — neither are accepted here.
// Admin-authenticated only.
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  let body: {
    name?: string; xHandle?: string; website?: string; symbol?: string; bio?: string | null;
    ecosystem?: string; verificationStatus?: string; treasuryHealth?: string;
    priority?: number; pfp?: string | null; gitlawbRepo?: string | null;
    evidenceSources?: string[]; adminNotes?: string | null;
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

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("xHandle" in body) updates.x_handle = body.xHandle?.trim() || null;
  if ("website" in body) updates.website = body.website?.trim() || null;
  if ("symbol" in body) updates.symbol = body.symbol?.trim() || null;
  if ("bio" in body) updates.bio = body.bio?.trim().slice(0, 500) || null;
  if ("pfp" in body) updates.pfp = body.pfp?.trim() || null;
  if ("gitlawbRepo" in body) updates.gitlawb_repo = body.gitlawbRepo?.trim() || null;
  if ("adminNotes" in body) updates.admin_notes = body.adminNotes?.trim() || null;

  if ("ecosystem" in body) {
    if (body.ecosystem != null && !(ECOSYSTEMS as readonly string[]).includes(body.ecosystem)) {
      return NextResponse.json({ ok: false, error: `ecosystem must be one of: ${ECOSYSTEMS.join(", ")}` }, { status: 400 });
    }
    updates.ecosystem = body.ecosystem ?? null;
  }

  if ("verificationStatus" in body) {
    if (body.verificationStatus != null && !(VERIFICATION_STATUSES as readonly string[]).includes(body.verificationStatus)) {
      return NextResponse.json({ ok: false, error: `verificationStatus must be one of: ${VERIFICATION_STATUSES.join(", ")}` }, { status: 400 });
    }
    updates.verification_status = body.verificationStatus ?? null;
  }

  if ("treasuryHealth" in body) {
    if (body.treasuryHealth != null && !(TREASURY_HEALTH_VALUES as readonly string[]).includes(body.treasuryHealth)) {
      return NextResponse.json({ ok: false, error: `treasuryHealth must be one of: ${TREASURY_HEALTH_VALUES.join(", ")}` }, { status: 400 });
    }
    updates.treasury_health = body.treasuryHealth ?? null;
  }

  if ("priority" in body && body.priority != null) {
    const p = Number(body.priority);
    if (!Number.isInteger(p) || p < 0 || p > 100) {
      return NextResponse.json({ ok: false, error: "priority must be an integer 0–100" }, { status: 400 });
    }
    updates.priority = p;
  }

  if ("evidenceSources" in body) {
    if (!Array.isArray(body.evidenceSources)) {
      return NextResponse.json({ ok: false, error: "evidenceSources must be an array" }, { status: 400 });
    }
    updates.evidence_sources = body.evidenceSources.map((s) => String(s).trim()).filter(Boolean);
  }

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
