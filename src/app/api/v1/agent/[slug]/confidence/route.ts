// GET /api/v1/agent/[slug]/confidence
// Public — returns human-verified confidence label for an agent.
// Falls back to null if no label has been set by admin review.

import { NextRequest, NextResponse } from "next/server";
import { getConfidenceLabel, CONFIDENCE_META } from "@/lib/revenue-confidence";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const label = await getConfidenceLabel(slug);

  if (!label) return NextResponse.json({ ok: true, label: null });

  return NextResponse.json({
    ok: true,
    label: {
      ...label,
      meta: CONFIDENCE_META[label.confidence_level],
    },
  });
}
