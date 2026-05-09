import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { LedgerSummary, CategorySummary, TimeRange } from "@/lib/ledger";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI summary not available." }, { status: 503 });
  }

  const body = await request.json();
  const { wallet, range, summary, categories } = body as {
    wallet: string;
    range: TimeRange;
    summary: LedgerSummary;
    categories: CategorySummary[];
  };

  const rangeLabel = { "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days" }[range] ?? "30 days";
  const topCats = categories.slice(0, 3).map((c) => `${c.label} ($${c.totalUsdc.toFixed(2)} USDC)`).join(", ");

  const prompt = `You are x402Books AI, a financial analyst for onchain Base USDC activity.

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

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : null;
  if (!text) return NextResponse.json({ error: "No summary generated." }, { status: 500 });

  return NextResponse.json({ summary: text });
}
