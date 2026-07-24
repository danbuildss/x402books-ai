import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRevenueEvents } from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const VALID_CLASSIFICATIONS = [
  "revenue_candidate", "unresolved_inflow", "inference_spend", "treasury_movement",
  "token_distribution", "external_expense", "unknown",
] as const;
const VALID_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agentSlug = slug.toLowerCase().trim();
  const auth = await v1Auth(req, { agentSlug });
  if (!auth.ok) return auth.response;
  if (!hasSupabaseAdminEnv()) return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 200);
  const offset = Math.max(parseInt(sp.get("offset") ?? "0", 10), 0);
  const chain = sp.get("chain") ?? undefined;
  const cls = sp.get("classification") ?? undefined;
  const since = sp.get("since") ?? undefined;

  if (chain && !(VALID_CHAINS as readonly string[]).includes(chain)) return NextResponse.json({ ok: false, error: `Invalid chain. Supported: ${VALID_CHAINS.join(", ")}` }, { status: 400 });
  if (cls && !(VALID_CLASSIFICATIONS as readonly string[]).includes(cls)) return NextResponse.json({ ok: false, error: `Invalid classification. Supported: ${VALID_CLASSIFICATIONS.join(", ")}` }, { status: 400 });
  if (since && Number.isNaN(Date.parse(since))) return NextResponse.json({ ok: false, error: "Invalid since date. Use ISO format, e.g. 2025-01-01" }, { status: 400 });

  try {
    const events = await getRevenueEvents(agentSlug, { limit, offset, chain, classification: cls, sinceDate: since });
    const pageCounts = (events as Record<string, unknown>[]).reduce<Record<string, number>>((acc, event) => {
      const classification = String(event.classification ?? "unknown");
      acc[classification] = (acc[classification] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      agent_slug: agentSlug,
      pagination: { limit, offset, returned: events.length },
      filters: { chain: chain ?? null, classification: cls ?? null, since: since ?? null },
      page_counts: pageCounts,
      events,
      accounting_basis: "onchain_activity_only",
      classification_guide: {
        revenue_candidate: "Inbound from another manifest-declared wallet. Counterparty attribution is known; commercial purpose and delivery remain unproven.",
        unresolved_inflow: "Inbound stablecoin settlement without linked commercial or delivery evidence.",
        inference_spend: "Outbound to an inference/service contract or manifest-declared wallet.",
        treasury_movement: "Transfer between wallets declared for the same agent.",
        token_distribution: "Outbound non-stablecoin token movement. Not revenue.",
        external_expense: "Outbound value with unresolved expense purpose.",
        unknown: "No reliable economic-purpose signal.",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error. Please try again." }, { status: 500 });
  }
}
