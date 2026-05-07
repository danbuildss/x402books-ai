import Anthropic from "@anthropic-ai/sdk";
import {
  LedgerCategory,
  LedgerRiskFlag,
  LedgerTransaction,
  enrichLedgerTransactions,
} from "@/lib/ledger";

type AiTransactionResult = {
  tx_hash: string;
  direction: "income" | "expense" | "internal";
  category: LedgerCategory;
  memo: string;
  confidence: number;
  tax_note: string;
  risk_flag: LedgerRiskFlag;
};

const categories = new Set<LedgerCategory>([
  "api_call",
  "data_access",
  "compute",
  "agent_service",
  "subscription",
  "income",
  "refund",
  "internal_transfer",
  "unknown",
]);

const riskFlags = new Set<LedgerRiskFlag>([
  "none",
  "duplicate",
  "unusual_amount",
  "high_frequency",
  "unknown_counterparty",
]);

function parseJsonArray(content: string) {
  const trimmed = content.trim();
  const json = trimmed.startsWith("[")
    ? trimmed
    : trimmed.slice(trimmed.indexOf("["), trimmed.lastIndexOf("]") + 1);

  return JSON.parse(json) as AiTransactionResult[];
}

function sanitizeAiResult(result: AiTransactionResult) {
  return {
    tx_hash: String(result.tx_hash || ""),
    direction: result.direction,
    category: categories.has(result.category) ? result.category : "unknown",
    memo: String(result.memo || "Categorized transaction").slice(0, 80),
    confidence: Math.max(0, Math.min(100, Number(result.confidence || 0))),
    tax_note: String(result.tax_note || "unknown").slice(0, 120),
    risk_flag: riskFlags.has(result.risk_flag) ? result.risk_flag : "unknown_counterparty",
  } satisfies AiTransactionResult;
}

export async function categorizeWithAi(transactions: LedgerTransaction[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      provider: "rules",
      transactions: enrichLedgerTransactions(transactions),
    };
  }

  const compactTransactions = transactions.slice(0, 50).map((transaction) => ({
    tx_hash: transaction.txHash,
    timestamp: transaction.timestamp,
    direction: transaction.direction,
    amount_usdc: transaction.amountUsdc,
    counterparty: transaction.counterparty,
    rule_category: transaction.category || "unknown",
    is_likely_x402: Boolean(transaction.isLikelyX402),
    risk_flag: transaction.riskFlag || "none",
  }));

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system:
      "You are x402Books AI, an accounting assistant for Base USDC microtransactions and AI-agent payments. " +
      "Return a strict JSON array only — no prose, no markdown fences. " +
      "Each element must have: tx_hash, direction, category, memo (≤12 words), confidence (0-100), tax_note (≤20 words), risk_flag. " +
      "Valid categories: api_call, data_access, compute, agent_service, subscription, income, refund, internal_transfer, unknown. " +
      "Valid risk_flags: none, duplicate, unusual_amount, high_frequency, unknown_counterparty. " +
      "Do not invent facts. Use unknown when unsure. Prefer conservative accounting labels.",
    messages: [
      {
        role: "user",
        content: JSON.stringify(compactTransactions),
      },
    ],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : null;

  if (!content) {
    throw new Error("AI categorization returned no content.");
  }

  const results = parseJsonArray(content).map(sanitizeAiResult);
  const resultsByHash = new Map(results.map((result) => [result.tx_hash, result]));

  return {
    provider: "claude",
    transactions: transactions.map((transaction) => {
      const result = resultsByHash.get(transaction.txHash);

      if (!result) {
        return transaction;
      }

      return {
        ...transaction,
        category: result.category,
        confidenceScore: result.confidence,
        memo: result.memo,
        riskFlag: result.risk_flag,
      } satisfies LedgerTransaction;
    }),
  };
}
