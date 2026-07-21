// POST /api/admin/registry/fix-eligibility
//
// One-shot repair: scans all manifest wallets in registry_agent_wallets
// where address_type is null or 'unknown' and sets it from role.
// The books_eligible DB trigger recomputes automatically on each update.
//
// Auth: ZETTA_INTERNAL_SECRET

import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const ROLE_TO_TYPE: Record<string, string> = {
  treasury:       "treasury_contract",
  operator:       "eoa",
  fee:            "eoa",
  revenue:        "eoa",
  surplus_wallet: "eoa",
  deployer:       "eoa",
};

const INELIGIBLE_ROLES = new Set(["token_contract", "token", "smart_contract"]);

export async function POST(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 });
  }

  const sb = getSupabaseAdminClient();

  const { data, error } = await sb
    .from("registry_agent_wallets")
    .select("id, agent_name, address, role, address_type, evidence_source")
    .eq("evidence_source", "manifest")
    .or("address_type.is.null,address_type.eq.unknown");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const candidates = (data ?? []).filter(
    (w) => !INELIGIBLE_ROLES.has((w.role ?? "").toLowerCase()),
  );

  let fixed = 0;
  const details: { agent: string; address: string; role: string; address_type: string }[] = [];
  const errors: string[] = [];

  for (const wallet of candidates) {
    const role = (wallet.role ?? "").toLowerCase();
    // Unmapped roles stay unclassified — never default to eoa.
    const newType = ROLE_TO_TYPE[role];
    if (!newType) continue;

    const { error: updateError } = await sb
      .from("registry_agent_wallets")
      .update({ address_type: newType })
      .eq("id", wallet.id);

    if (updateError) {
      errors.push(`${wallet.agent_name}:${wallet.address} — ${updateError.message}`);
    } else {
      fixed++;
      details.push({
        agent:        wallet.agent_name,
        address:      wallet.address,
        role:         wallet.role ?? "",
        address_type: newType,
      });
    }
  }

  return NextResponse.json({ ok: true, fixed, errors, details });
}
