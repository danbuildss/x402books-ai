import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

function authOk(req: NextRequest): boolean {
  const secret = process.env.X402BOOKS_INTERNAL_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// GET /api/registry/claims — admin: list all claim requests
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, claims: [] });

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("registry_claims")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, claims: data ?? [] });
}

// PATCH /api/registry/claims — admin: approve or reject a claim
// Body: { id: string, action: "approve" | "reject" }
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });

  let body: { id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ ok: false, error: "id and action (approve|reject) required" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();

  // Fetch the claim to get agent name
  const { data: claim, error: fetchError } = await sb
    .from("registry_claims")
    .select("agent_name, wallet_address, wallet_matched")
    .eq("id", id)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json({ ok: false, error: "Claim not found" }, { status: 404 });
  }

  // Update claim status
  const { error: updateError } = await sb
    .from("registry_claims")
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });

  // On approval: set registry_agents verification_status to "Claimed"
  if (action === "approve") {
    await sb
      .from("registry_agents")
      .update({ verification_status: "Claimed", updated_at: new Date().toISOString() })
      .eq("name", (claim as { agent_name: string }).agent_name);
  }

  return NextResponse.json({ ok: true });
}
