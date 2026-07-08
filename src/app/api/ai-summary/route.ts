import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { LedgerSummary, CategorySummary, TimeRange } from "@/lib/ledger";

function buildFallbackSummary(
  range: string,
  summary: LedgerSummary,
  categories: CategorySummary[],
): string {
  const top = categories[0];
  const x402Note =
    summary.likelyX402Count > 0
      ? `${summary.likelyX402Count} likely x402 agent payments detected.`
      : "No x402 agent payments detected.";
  const flowNote =
    summary.netFlow >= 0
      ? `Net flow is positive at +$${summary.netFlow.toFixed(2)} USDC.`
      : `Net flow is negative at -$${Math.abs(summary.netFlow).toFixed(2)} USDC — spending exceeds income.`;
  const categoryNote = top
    ? `${top.label} is the leading spend category at $${top.totalUsdc.toFixed(2)} USDC across ${top.count} transactions.`
    : "";
  return [
    `This wallet recorded ${summary.transactionCount} USDC transfers over the ${range} period.`,
    flowNote,
    x402Note,
    categoryNote,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: Request) {
  const body = await request.json();
  const { wallet, range, summary, categories } = body as {
    wallet: string;
    range: TimeRange;
    summary: LedgerSummary;
    categories: CategorySummary[];
  };

  const rangeLabel = { "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days" }[range] ?? "30 days";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      summary: buildFallbackSummary(rangeLabel, summary, categories),
      provider: "rules",
    });
  }

  const topCats = categories
    .slice(0, 3)
    .map((c) => `${c.label} ($${c.totalUsdc.toFixed(2)} USDC, ${c.count} tx)`)
    .join(", ");

  const prompt = `You are Luca, Zetta's financial analyst for on-chain Base USDC activity.

Wallet: ${wallet}
Period: Last ${rangeLabel}
Total spend: $${summary.totalSpend.toFixed(2)} USDC
Total income: $${summary.totalIncome.toFixed(2)} USDC
Net flow: ${summary.netFlow >= 0 ? "+" : ""}$${summary.netFlow.toFixed(2)} USDC
Transactions: ${summary.transactionCount}
Likely x402 agent payments: ${summary.likelyX402Count}
Top categories: ${topCats || "none"}
Budget status: ${summary.netFlow >= 0 ? "healthy" : summary.totalSpend > summary.totalIncome * 1.25 ? "overspending" : "watch"}

Write a concise 2-3 sentence financial summary for this wallet. Be specific with numbers. Mention x402 agent payments if present. End with one actionable insight. Plain text only — no markdown, no headers.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : null;
    if (!text) throw new Error("empty response");

    return NextResponse.json({ summary: text, provider: "claude" });
  } catch {
    return NextResponse.json({
      summary: buildFallbackSummary(rangeLabel, summary, categories),
      provider: "rules",
    });
  }
}
