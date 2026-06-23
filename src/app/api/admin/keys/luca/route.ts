// POST /api/admin/keys/luca  — provision or rotate Luca's API key
// GET  /api/admin/keys/luca  — show current Luca key metadata (not the raw key)
//
// Protected by X402BOOKS_INTERNAL_SECRET. Luca calls POST once on startup
// if he doesn't have a key stored, or when rotating. The raw key is returned
// only on creation — store it immediately.

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { TIER_LIMITS } from "@/lib/luca-token";

const LUCA_KEY_NAME = "Luca AI Agent";

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// GET — return current Luca key info (no raw key)
export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("api_keys")
    .select("id, key_prefix, name, tier, rate_limit_per_day, requests_today, requests_total, is_active, created_at, last_used_at")
    .eq("name", LUCA_KEY_NAME)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ ok: true, key: null, message: "No active Luca key. POST to provision one." });
  }

  return NextResponse.json({ ok: true, key: data });
}

// POST — provision a new Luca key (revokes any existing one first)
export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({})) as { rotate?: boolean };
  const sb = getSupabaseAdminClient();

  // Revoke any existing active Luca keys
  await sb
    .from("api_keys")
    .update({ is_active: false })
    .eq("name", LUCA_KEY_NAME)
    .eq("is_active", true);

  // Generate new key
  const raw = "zt_live_" + randomHex(20);
  const hash = await sha256hex(raw);
  const prefix = raw.slice(0, 16);

  const { data, error } = await sb
    .from("api_keys")
    .insert({
      key_hash:          hash,
      key_prefix:        prefix,
      name:              LUCA_KEY_NAME,
      tier:              "luca",
      rate_limit_per_day: TIER_LIMITS.luca,
    })
    .select("id, key_prefix, name, tier, rate_limit_per_day, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Failed to create key" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rotated: body.rotate === true,
    // Raw key returned ONCE — store it immediately, it cannot be retrieved again
    key: raw,
    meta: data,
    usage: {
      limit_per_day: TIER_LIMITS.luca,
      tier: "luca",
    },
    endpoints: {
      agent_books:     "GET /api/v1/agent-books/[slug]?range=30d",
      agent_state:     "GET /api/v1/agent-financial-state?wallet=0x...",
      full_report:     "GET /api/v1/full-report?wallet=0x...",
      ledger_summary:  "GET /api/v1/ledger-summary?wallet=0x...",
      transactions:    "GET /api/v1/transactions?wallet=0x...",
      categorize:      "GET /api/v1/categorize?wallet=0x...",
      analyze:         "POST /api/v1/luca/analyze",
      agent_events:    "GET /api/v1/agent-events?agent_id=[id]",
    },
    auth: "Authorization: Bearer <key>   OR   X-API-Key: <key>",
  });
}
