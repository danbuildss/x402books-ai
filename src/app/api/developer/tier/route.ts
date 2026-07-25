// GET /api/developer/tier — return the highest tier across the session's active API keys
import { NextResponse } from "next/server";
import { listApiKeys } from "@/lib/api-keys";
import { getSessionCodeId } from "@/lib/access-auth";
import { type LucaTier } from "@/lib/luca-token";

const TIER_RANK: Record<LucaTier, number> = { free: 0, holder: 1, whale: 2, luca: 3 };

export async function GET(request: Request) {
  const codeId = getSessionCodeId(request);
  if (!codeId) {
    return NextResponse.json({ tier: "free" as LucaTier });
  }

  try {
    const keys = await listApiKeys(codeId);
    const active = keys.filter((k) => k.is_active !== false);
    const best = active.reduce<LucaTier>((top, k) => {
      const t = (k.tier ?? "free") as LucaTier;
      return TIER_RANK[t] > TIER_RANK[top] ? t : top;
    }, "free");
    return NextResponse.json({ tier: best });
  } catch {
    return NextResponse.json({ tier: "free" as LucaTier });
  }
}
