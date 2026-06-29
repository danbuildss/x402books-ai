import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const VALID_TYPES = ["eoa", "treasury_contract", "smart_account", "token_contract", "proxy_contract", "smart_contract", "unknown"] as const;
type AddressTypeOverride = typeof VALID_TYPES[number];

export async function PATCH(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }

  let body: { address?: string; address_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const address = (body.address ?? "").trim().toLowerCase();
  const address_type = body.address_type as AddressTypeOverride | undefined;

  if (!address || !/^0x[0-9a-f]{40}$/i.test(address)) {
    return NextResponse.json({ ok: false, error: "Invalid wallet address" }, { status: 400 });
  }
  if (!address_type || !VALID_TYPES.includes(address_type)) {
    return NextResponse.json({ ok: false, error: `address_type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();
  // Use ilike for case-insensitive match — DB may store mixed-case checksummed addresses
  const { data, error } = await sb
    .from("registry_agent_wallets")
    .update({ address_type })
    .ilike("address", address)
    .select("address, agent_name")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: `No wallet found with address ${address}` }, { status: 404 });

  return NextResponse.json({ ok: true, address: data.address, agent_name: data.agent_name, address_type });
}
