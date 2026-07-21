import { NextRequest, NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { getRevenueEvents } from "@/lib/truth-engine-db";
import { hasSupabaseAdminEnv } from "@/lib/supabase-admin";

// Conservative public endpoint: exposes classified on-chain events.
// Never aggregates dollars for ambiguous buckets.
// settlement_revenue is only present if a known registry wallet was the sender.

const VALID_CLASSIFICATIONS = [
  "settlement_revenue",
  "fee_received",
  "inference_spend",
  "treasury_movement",
  "token_distribution",
  "external_expense",
  "unknown",
] as const;

const VALID_CHAINS = ["base", "ethereum", "arbitrum", "optimism", "polygon"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const agentSlug = slug.toLowerCase().trim();

  // Agent-scoped keys may only query their own agent's data — enforced centrally
  const auth = await v1Auth(req, { agentSlug });
  if (!auth.ok) return auth.response;

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ ok: false, error: "Registry unavailable" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;

  const limit  = Math.min(parseInt(sp.get("limit")  ?? "50",  10), 200);
  const offset = Math.max(parseInt(sp.get("offset") ?? "0",   10), 0);
  const chain  = sp.get("chain")          ?? undefined;
  const cls    = sp.get("classification") ?? undefined;
  const since  = sp.get("since")          ?? undefined;

  if (chain && !(VALID_CHAINS as readonly string[]).includes(chain)) {
    return NextResponse.json(
      { ok: false, error: `Invalid chain. Supported: ${VALID_CHAINS.join(", ")}` },
      { status: 400 },
    );
  }

  if (cls && !(VALID_CLASSIFICATIONS as readonly string[]).includes(cls)) {
    return NextResponse.json(
      { ok: false, error: `Invalid classification. Supported: ${VALID_CLASSIFICATIONS.join(", ")}` },
      { status: 400 },
    );
  }

  if (since && isNaN(Date.parse(since))) {
    return NextResponse.json(
      { ok: false, error: "Invalid since date. Use ISO format, e.g. 2025-01-01" },
      { status: 400 },
    );
  }

  try {
    const events = await getRevenueEvents(agentSlug, { limit, offset, chain, classification: cls, sinceDate: since });

    type RawEvent = Record<string, unknown>;

    // Build per-classification counts from this page
    const pageCounts = (events as RawEvent[]).reduce<Record<string, number>>((acc, e) => {
      const c = String(e.classification ?? "unknown");
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      ok:         true,
      agent_slug: agentSlug,
      pagination: { limit, offset, returned: events.length },
      filters:    { chain: chain ?? null, classification: cls ?? null, since: since ?? null },
      page_counts: pageCounts,
      events,
      classification_guide: {
        settlement_revenue:  "Inbound from a known registry wallet. High confidence.",
        fee_received:        "Inbound stablecoin from unknown source. Possible service fee. Medium confidence.",
        inference_spend:     "Outbound to inference/service contract or registry wallet. Operational cost.",
        treasury_movement:   "Transfer between this agent's own declared wallets.",
        token_distribution:  "Outbound non-stablecoin ERC-20. Not revenue.",
        external_expense:    "Outbound to unknown address. Low confidence classification.",
        unknown:             "No reliable classification signal. Awaiting more context.",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error. Please try again." }, { status: 500 });
  }
}
