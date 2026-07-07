// Luca Tool Definitions
// 
// Five tools Luca can call mid-conversation to pull live data.
// Each tool maps to an existing lib function — no new backend logic.
// Used by the streaming chat route (/api/luca/chat).

import { buildAgentBooks, getAgentBySlug } from "@/lib/agent-books";
import { getWalletStableBalance } from "@/lib/treasury-balance";
import { computeMomentum } from "@/lib/agent-momentum";
import { getAgentBooksHistory } from "@/lib/agent-books-history";
import type { TimeRange } from "@/lib/ledger";

export type ToolName =
  | "get_agent_books"
  | "get_treasury_balance"
  | "get_momentum"
  | "get_anomaly_alerts"
  | "get_agent_info";

// ── Tool schemas for Claude API ────────────────────────────────────────────────

export const LUCA_TOOL_DEFINITIONS = [
  {
    name: "get_agent_books" as const,
    description:
      "Fetch the attributed financial books for an agent: revenue, expenses, net income, wallet count, and confidence signals. Use this when asked about an agent's financial performance, revenue, costs, or profitability.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug:   { type: "string", description: "Agent slug, e.g. 'aeon'" },
        period: { type: "string", enum: ["7d", "14d", "30d", "90d"], description: "Lookback window" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_treasury_balance" as const,
    description:
      "Fetch the current stablecoin (USDC + USDT) balance for a wallet address. Use this when asked about treasury health, runway, or current balance.",
    input_schema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "0x wallet address" },
      },
      required: ["address"],
    },
  },
  {
    name: "get_momentum" as const,
    description:
      "Compute directional momentum (growing/stable/declining) for an agent's revenue, expenses, net income, and treasury over recent snapshots. Use this when asked about trends, direction, or whether an agent is improving.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug:        { type: "string", description: "Agent slug" },
        window_days: { type: "number", description: "Lookback window in days (default 30)" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_anomaly_alerts" as const,
    description:
      "Fetch active anomaly alerts for an agent: unusual volume, new counterparties, timing gaps, or ratio breakdowns. Use this when asked about risks, red flags, or unusual activity.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Agent slug" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_agent_info" as const,
    description:
      "Fetch basic registry information for an agent: name, ecosystem, verification status, wallet count. Use this when asked who or what an agent is.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Agent slug" },
      },
      required: ["slug"],
    },
  },
] as const;

// ── Tool executors ─────────────────────────────────────────────────────────────

export async function executeTool(
  name: ToolName,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_agent_books": {
      const slug   = input.slug as string;
      const period = (input.period as TimeRange) ?? "30d";
      const agent  = await getAgentBySlug(slug);
      if (!agent) return { error: `Agent "${slug}" not found.` };
      const books = await buildAgentBooks(agent, period);
      if (!books.attributed) return { attributed: false, note: "No manifest-declared wallets. Books require a verified wallet manifest." };
      return {
        attributed: true,
        period,
        revenue_usd:    books.financials.revenue_usd,
        expenses_usd:   books.financials.expenses_usd,
        net_income_usd: books.financials.net_income_usd,
        treasury_usd:   books.financials.treasury_balance_usd,
        tx_count:       books.financials.tx_count,
        confidence:     books.confidence,
        settlement:     books.luca_summary ?? null,
      };
    }

    case "get_treasury_balance": {
      const address = input.address as string;
      const balance = await getWalletStableBalance(address);
      return { address, stable_balance_usd: balance };
    }

    case "get_momentum": {
      const slug       = input.slug as string;
      const windowDays = (input.window_days as number) ?? 30;
      const { getAgentBooksHistory: fetchHistory } = await import("@/lib/agent-books-history");
      const snapshots  = await fetchHistory(slug, 90);
      if (!snapshots || snapshots.length < 2) {
        return { error: "Insufficient snapshot history to compute momentum. Need at least 2 snapshots." };
      }
      const momentum = computeMomentum(snapshots, windowDays);
      if (!momentum) return { error: "Could not compute momentum." };
      return {
        slug,
        window_days: windowDays,
        revenue:    { direction: momentum.revenue.direction,    pct: momentum.revenue.pct.toFixed(1) },
        expenses:   { direction: momentum.expenses.direction,   pct: momentum.expenses.pct.toFixed(1) },
        net_income: { direction: momentum.net_income.direction, pct: momentum.net_income.pct.toFixed(1) },
        treasury:   momentum.treasury
          ? { direction: momentum.treasury.direction, pct: momentum.treasury.pct.toFixed(1) }
          : null,
        snapshot_count: momentum.snapshot_count,
      };
    }

    case "get_anomaly_alerts": {
      const slug = input.slug as string;
      try {
        const { getAnomaliesForAgent } = await import("@/lib/anomaly-detector");
        const anomalies = await getAnomaliesForAgent(slug);
        return { slug, anomalies: anomalies ?? [], count: (anomalies ?? []).length };
      } catch {
        return { slug, anomalies: [], count: 0, note: "Anomaly detection not yet initialized for this agent." };
      }
    }

    case "get_agent_info": {
      const slug  = input.slug as string;
      const agent = await getAgentBySlug(slug);
      if (!agent) return { error: `Agent "${slug}" not found.` };
      return {
        name:                agent.name,
        slug,
        ecosystem:           agent.ecosystem,
        verification_status: agent.verificationStatus,
        wallet_count:        (agent.wallets ?? []).length,
      };
    }

    default:
      return { error: `Unknown tool: ${name as string}` };
  }
}
