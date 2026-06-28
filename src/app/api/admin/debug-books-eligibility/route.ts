import { NextRequest, NextResponse } from "next/server";
import { internalAuth } from "@/lib/internal-auth";
import { getRegistryAgents } from "@/lib/registry-db";
import { isBooksEligibleWallet } from "@/lib/wallet-eligibility";
import { toSlug } from "@/app/registry/[slug]/slug";
import { getConfidenceLabel } from "@/lib/revenue-confidence";

export async function GET(req: NextRequest) {
  if (!internalAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get("slug") ?? "aeon";
  const { agents } = await getRegistryAgents();
  const agent = agents.find((a) => toSlug(a.name) === slug);

  if (!agent) {
    return NextResponse.json({ error: `Agent '${slug}' not found` }, { status: 404 });
  }

  const confidenceLabel = await getConfidenceLabel(slug);

  const walletResults = (agent.wallets ?? []).map((w) => {
    const result = isBooksEligibleWallet(w, agent.tokenAddress);
    return {
      address: w.address,
      evidenceSource: w.evidenceSource,
      address_type: w.address_type,
      role: w.role,
      chain: w.chain,
      confidence: w.confidence,
      eligible: result.eligible,
      reason: result.reason,
    };
  });

  return NextResponse.json({
    slug,
    name: agent.name,
    tokenAddress: agent.tokenAddress,
    confidenceLabel,
    wallets: walletResults,
    eligibleCount: walletResults.filter((w) => w.eligible).length,
  });
}
