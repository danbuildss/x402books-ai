import { NextRequest, NextResponse } from "next/server";
import { getRegistryAgents } from "@/lib/registry-db";
import { buildAgentBooks } from "@/lib/agent-books";
import type { TimeRange } from "@/lib/ledger";
import { AGENTS } from "@/app/registry/data";
import { toSlug } from "@/app/registry/[slug]/slug";

export const revalidate = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const VALID_PERIODS = new Set(["7d", "14d", "30d", "90d"]);
  const rawPeriod = req.nextUrl.searchParams.get("period") ?? "30d";
  const period = (VALID_PERIODS.has(rawPeriod) ? rawPeriod : "30d") as TimeRange;

  let agent;
  try {
    const { agents } = await getRegistryAgents();
    agent = agents.find((a) => toSlug(a.name) === slug);
  } catch {
    agent = AGENTS.find((a) => toSlug(a.name) === slug);
  }

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const books = await buildAgentBooks(agent, period);
    if (!books.attributed) {
      return NextResponse.json({ attributed: false, reason: books.reason });
    }
    return NextResponse.json({
      attributed: true,
      period,
      financials: {
        revenue_usd:          books.financials.revenue_usd,
        expenses_usd:         books.financials.expenses_usd,
        net_income_usd:       books.financials.net_income_usd,
        treasury_balance_usd: books.financials.treasury_balance_usd,
        tx_count:             books.financials.tx_count,
      },
    });
  } catch {
    return NextResponse.json({ attributed: false, reason: "Books temporarily unavailable." });
  }
}
