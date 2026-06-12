import { NextRequest, NextResponse } from "next/server";
import { fetchBankrTopTokens } from "@/lib/dune";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";
import { internalAuth as authOk } from "@/lib/internal-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = getSupabaseAdminClient();

  // Fetch Dune top tokens (query 6900376, up to 500)
  const tokens = await fetchBankrTopTokens();
  if (tokens.length === 0) {
    return NextResponse.json({ error: "Dune returned no tokens" }, { status: 502 });
  }

  // Build set of registry token addresses
  const { data: agents } = await sb
    .from("registry_agents")
    .select("name, token_address")
    .not("token_address", "is", null);

  const registryCas = new Map<string, string>(
    (agents ?? []).map((a: { name: string; token_address: string }) => [
      a.token_address.toLowerCase(),
      a.name,
    ]),
  );

  // Build set of existing import candidates to avoid dupes
  const { data: existing } = await sb
    .from("registry_import_candidates")
    .select("ca");

  const existingCas = new Set<string>(
    (existing ?? []).map((c: { ca: string }) => c.ca.toLowerCase()),
  );

  let enriched = 0;
  let skipped = 0;
  const toInsert: object[] = [];

  for (const token of tokens) {
    const ca = (token.ca ?? "").toLowerCase();
    if (!ca) continue;

    if (registryCas.has(ca)) {
      // Enrich existing registry agent with latest market data
      const { error } = await sb
        .from("registry_agents")
        .update({
          market_data: token,
          last_dune_sync: new Date().toISOString(),
        })
        .ilike("token_address", ca);

      if (!error) enriched++;
    } else if (!existingCas.has(ca)) {
      toInsert.push({
        ca: token.ca,
        ticker: token.ticker,
        name: token.name,
        source: "dune:6900376",
        dune_data: token,
        status: "pending",
      });
    } else {
      skipped++;
    }
  }

  if (toInsert.length > 0) {
    await sb.from("registry_import_candidates").insert(toInsert);
  }

  return NextResponse.json({
    ok: true,
    total: tokens.length,
    enriched,
    newCandidates: toInsert.length,
    skipped,
  });
}
