import type { LedgerCategory, CategorySummary, DailyFlow } from "./ledger";

// ── Settlement pattern classification ─────────────────────────────────────────
// Takes on-chain summary data and returns cold, operational Luca phrases.
// Output is intentionally terse — accounting-focused, no hype.

export type SettlementPattern =
  | "heavy_outbound_settlement"
  | "stable_treasury"
  | "high_internal_transfer"
  | "incomplete_wallet_role"
  | "dormant"
  | "active_operational"
  | "revenue_generating"
  | "high_spend_low_revenue"
  | "recurring_flow_detected"
  | "unknown_counterparty_dominant";

export interface SettlementClassification {
  patterns: SettlementPattern[];
  verdict: string;
  signals: string[];
}

const PATTERN_LABELS: Record<SettlementPattern, string> = {
  heavy_outbound_settlement:     "Heavy outbound settlement activity detected.",
  stable_treasury:               "Stable treasury behavior.",
  high_internal_transfer:        "High internal transfer ratio.",
  incomplete_wallet_role:        "Wallet-role verification incomplete.",
  dormant:                       "No recent activity detected.",
  active_operational:            "Operationally active.",
  revenue_generating:            "Revenue-generating activity confirmed.",
  high_spend_low_revenue:        "Spend significantly exceeds revenue — monitor runway.",
  recurring_flow_detected:       "Recurring flow pattern detected.",
  unknown_counterparty_dominant: "Majority of flows to unclassified counterparties.",
};

interface ClassifyInput {
  totalInflow: number;
  totalOutflow: number;
  txCount: number;
  internalTransferCount?: number;
  unknownCounterpartyRatio?: number;   // 0–1
  categories: CategorySummary[];
  dailyFlows?: DailyFlow[];
  walletRolesDeclared?: boolean;
}

export function classifySettlementPattern(input: ClassifyInput): SettlementClassification {
  const {
    totalInflow,
    totalOutflow,
    txCount,
    internalTransferCount = 0,
    unknownCounterpartyRatio = 0,
    categories,
    dailyFlows = [],
    walletRolesDeclared = false,
  } = input;

  const patterns: SettlementPattern[] = [];
  const signals: string[] = [];

  // Dormant
  if (txCount === 0) {
    patterns.push("dormant");
    return { patterns, signals, verdict: PATTERN_LABELS.dormant };
  }

  // Active
  patterns.push("active_operational");

  // Outbound dominance — settlement-heavy
  if (totalOutflow > 0 && totalOutflow > totalInflow * 1.4) {
    patterns.push("heavy_outbound_settlement");
    signals.push(`Outflow $${totalOutflow.toFixed(2)} vs inflow $${totalInflow.toFixed(2)}`);
  }

  // Stable treasury — balanced, low variance
  if (totalInflow > 0 && totalOutflow > 0) {
    const ratio = totalOutflow / totalInflow;
    if (ratio >= 0.7 && ratio <= 1.3) {
      patterns.push("stable_treasury");
    }
  }

  // Revenue generating
  const hasIncome = categories.some((c) => ["income", "agent_revenue", "inference_sale"].includes(c.category) && c.totalUsdc > 0);
  if (hasIncome) {
    patterns.push("revenue_generating");
    const rev = categories.filter((c) => ["income", "agent_revenue", "inference_sale"].includes(c.category));
    const total = rev.reduce((s, c) => s + c.totalUsdc, 0);
    signals.push(`Revenue: $${total.toFixed(2)}`);
  }

  // High spend low revenue
  const spend = categories.filter((c) => ["api_call", "compute", "agent_service", "provider_spend", "inference_purchase"].includes(c.category));
  const totalSpend = spend.reduce((s, c) => s + c.totalUsdc, 0);
  const revenue = categories.filter((c) => ["income", "agent_revenue", "inference_sale"].includes(c.category));
  const totalRevenue = revenue.reduce((s, c) => s + c.totalUsdc, 0);
  if (totalSpend > 0 && totalSpend > totalRevenue * 2) {
    patterns.push("high_spend_low_revenue");
  }

  // High internal transfer ratio
  if (txCount > 0 && internalTransferCount / txCount > 0.4) {
    patterns.push("high_internal_transfer");
    signals.push(`${Math.round((internalTransferCount / txCount) * 100)}% internal transfers`);
  }

  // Recurring flow — consistent daily activity
  if (dailyFlows.length >= 5) {
    const activeDays = dailyFlows.filter((d) => d.spend > 0 || d.income > 0).length;
    if (activeDays / dailyFlows.length > 0.6) {
      patterns.push("recurring_flow_detected");
      signals.push(`Active ${activeDays}/${dailyFlows.length} days`);
    }
  }

  // Unknown counterparty
  if (unknownCounterpartyRatio > 0.5) {
    patterns.push("unknown_counterparty_dominant");
    signals.push(`${Math.round(unknownCounterpartyRatio * 100)}% flows to unclassified addresses`);
  }

  // Wallet role clarity
  if (!walletRolesDeclared) {
    patterns.push("incomplete_wallet_role");
  }

  const verdict = buildSettlementVerdict(patterns, signals);
  return { patterns, signals, verdict };
}

function buildSettlementVerdict(patterns: SettlementPattern[], signals: string[]): string {
  const lines: string[] = [];

  // Lead with most operationally significant pattern
  const priority: SettlementPattern[] = [
    "dormant",
    "heavy_outbound_settlement",
    "high_spend_low_revenue",
    "stable_treasury",
    "revenue_generating",
    "high_internal_transfer",
    "recurring_flow_detected",
    "unknown_counterparty_dominant",
    "incomplete_wallet_role",
  ];

  const ordered = priority.filter((p) => patterns.includes(p));

  for (const p of ordered) {
    lines.push(PATTERN_LABELS[p]);
  }

  if (signals.length > 0) {
    lines.push(signals.join(" · ") + ".");
  }

  return lines.join(" ") || "Insufficient data for classification.";
}

// ── Wallet role normalization ──────────────────────────────────────────────────
// Normalizes wallet role strings from .agent/wallets.json manifests

export type WalletRole =
  | "treasury"
  | "revenue"
  | "expense"
  | "fee_recipient"
  | "payment_receiver"
  | "operator"
  | "deployer"
  | "token_contract"
  | "token_bound_account"
  | "unknown";

const ROLE_ALIASES: Record<string, WalletRole> = {
  // treasury
  treasury:            "treasury",
  // revenue / inflow
  revenue:             "revenue",
  income:              "revenue",
  // expense / outflow
  expense:             "expense",
  expenses:            "expense",
  spend:               "expense",
  // fee recipient
  fee:                 "fee_recipient",
  fee_recipient:       "fee_recipient",
  fees:                "fee_recipient",
  // payment receiver
  payment_receiver:    "payment_receiver",
  payment:             "payment_receiver",
  // operator
  operator:            "operator",
  ops:                 "operator",
  hot_wallet:          "operator",
  // deployer
  deployer:            "deployer",
  deploy:              "deployer",
  // token types
  token_contract:      "token_contract",
  token:               "token_contract",
  token_bound_account: "token_bound_account",
  tba:                 "token_bound_account",
};

export function normalizeWalletRole(raw: string): WalletRole {
  return ROLE_ALIASES[raw.toLowerCase().trim()] ?? "unknown";
}

export const WALLET_ROLE_LABELS: Record<WalletRole, string> = {
  treasury:            "treasury",
  revenue:             "revenue wallet",
  expense:             "expense wallet",
  fee_recipient:       "fee recipient",
  payment_receiver:    "payment receiver",
  operator:            "operator",
  deployer:            "deployer",
  token_contract:      "token contract",
  token_bound_account: "token-bound account",
  unknown:             "unknown role",
};
