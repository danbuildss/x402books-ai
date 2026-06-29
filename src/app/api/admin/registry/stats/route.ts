import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const sb = getSupabaseAdminClient();

  const { data: agents, error } = await sb
    .from("registry_agents")
    .select("name, ecosystem, verification_status, outreach_status, x_handle, website, symbol, last_checked, admin_notes");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: wallets } = await sb
    .from("registry_agent_wallets")
    .select("agent_name");

  const agentsWithWallets = new Set((wallets ?? []).map((w) => w.agent_name));

  const total = agents?.length ?? 0;

  const byEcosystem: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byOutreach: Record<string, number> = {};
  let withWallets = 0;
  let withXHandle = 0;
  let withWebsite = 0;
  let withSymbol = 0;
  let withVerdict = 0;
  let checkedThisMonth = 0;
  const thisMonth = new Date().toISOString().slice(0, 7);

  for (const a of agents ?? []) {
    byEcosystem[a.ecosystem ?? "Unknown"] = (byEcosystem[a.ecosystem ?? "Unknown"] ?? 0) + 1;
    const vs = a.verification_status ?? "Candidate";
    byStatus[vs] = (byStatus[vs] ?? 0) + 1;
    const os = a.outreach_status ?? "Not started";
    byOutreach[os] = (byOutreach[os] ?? 0) + 1;
    if (agentsWithWallets.has(a.name)) withWallets++;
    if (a.x_handle) withXHandle++;
    if (a.website) withWebsite++;
    if (a.symbol) withSymbol++;
    if (a.admin_notes) withVerdict++;
    if (a.last_checked && a.last_checked.startsWith(thisMonth)) checkedThisMonth++;
  }

  return NextResponse.json({
    ok: true,
    total,
    byEcosystem,
    byStatus,
    byOutreach,
    coverage: {
      withWallets,
      withXHandle,
      withWebsite,
      withSymbol,
      withVerdict,
      checkedThisMonth,
    },
    generatedAt: new Date().toISOString(),
  });
}
