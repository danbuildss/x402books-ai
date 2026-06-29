import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SKILLS = [
  {
    id: "wallet-audit",
    name: "Wallet Audit",
    description: "Classify an on-chain address and determine its books-eligibility type. Returns address_type (eoa, token_contract, treasury_contract, etc.) and whether it is compatible with books attribution.",
    endpoint: "/api/luca/skills/wallet-audit",
    method: "POST",
    input: {
      address: { type: "string", required: true, description: "0x Ethereum address to audit" },
      chain: { type: "string", required: false, default: "base", description: "Chain name (currently only 'base' is supported)" },
    },
  },
  {
    id: "agent-books",
    name: "Agent Books",
    description: "Full financial statement for a registered agent: revenue, expenses, net income, wallet count, and confidence signals. Only manifest-declared eoa and treasury_contract wallets are counted.",
    endpoint: "/api/luca/skills/agent-books",
    method: "POST",
    input: {
      slug: { type: "string", required: true, description: "Agent slug (e.g. 'aeon', 'luca')" },
      period: { type: "string", required: false, default: "30d", enum: ["7d", "14d", "30d", "90d"] },
    },
  },
  {
    id: "treasury-monitor",
    name: "Treasury Monitor",
    description: "Stablecoin balance and health of an agent's declared treasury wallets. Returns per-wallet USDC+USDT balances and an overall health signal (healthy/low/critical).",
    endpoint: "/api/luca/skills/treasury-monitor",
    method: "POST",
    input: {
      slug: { type: "string", required: false, description: "Agent slug. Required if address not provided." },
      address: { type: "string", required: false, description: "Single wallet address. Required if slug not provided." },
    },
  },
  {
    id: "revenue-analysis",
    name: "Revenue Analysis",
    description: "Revenue breakdown with the critical gross_inflow vs operating_revenue distinction. Shows quarantine breakdown, revenue recognition rate, and per-source attribution. gross_inflow_usd is NOT revenue.",
    endpoint: "/api/luca/skills/revenue-analysis",
    method: "POST",
    input: {
      slug: { type: "string", required: true, description: "Agent slug" },
      period: { type: "string", required: false, default: "30d", enum: ["7d", "14d", "30d", "90d"] },
    },
  },
  {
    id: "registry-check",
    name: "Registry Check",
    description: "Look up an agent by slug, name, or wallet address. Returns attribution tier, books-eligible wallet count, ERC-8004 identity if available, and full wallet list with eligibility status.",
    endpoint: "/api/luca/skills/registry-check",
    method: "POST",
    input: {
      query: { type: "string", required: true, description: "Agent slug, name fragment, or 0x wallet address" },
    },
  },
  {
    id: "luca-report",
    name: "Luca Report",
    description: "Full composite report: registry identity, attribution tier, financial statement, treasury balance, and Luca's narrative summary. The single-call complete picture of an agent's financial identity.",
    endpoint: "/api/luca/skills/luca-report",
    method: "POST",
    input: {
      slug: { type: "string", required: true, description: "Agent slug" },
      period: { type: "string", required: false, default: "30d", enum: ["7d", "14d", "30d", "90d"] },
    },
  },
  {
    id: "surplus-inference",
    name: "Surplus Inference",
    description: "OpenAI-compatible chat completions via Surplus intelligence. Auth: same Bearer API key as all other Luca skills. SURPLUS_API_KEY stays on Vercel — never needed by Hermes. Spend is automatically logged to inference_events and agent_economic_events. Use this instead of calling Surplus directly so all inference cost flows back into Zetta attribution.",
    endpoint: "/api/v1/luca/inference",
    method: "POST",
    auth: "Authorization: Bearer <api-key>  or  X-API-Key: <api-key>  (same key as all other skills)",
    input: {
      model: { type: "string", required: true, description: "Model name e.g. 'claude-sonnet-4-6', 'llama-3.3-70b'" },
      messages: { type: "array", required: true, description: "OpenAI-compatible messages array" },
      stream: { type: "boolean", required: false, default: false, description: "Set true for SSE streaming" },
    },
    notes: [
      "SURPLUS_API_KEY is server-side only — never send it from Hermes",
      "Spend is logged automatically — no separate log call needed",
      "Call this instead of surplusintelligence.ai directly to keep spend in Zetta",
    ],
  },
  {
    id: "agent-read",
    name: "Agent Read",
    description: "Single-call agent truth resolver. Takes any agent name, slug, or wallet address and returns: whether the agent is indexed in Zetta, the canonical read source label, full books + treasury if indexed, or a clear not-indexed signal for observational fallback. This is the required first call before making any claim about a named agent.",
    endpoint: "/api/v1/luca/agent-read",
    method: "POST",
    input: {
      agent: { type: "string", required: true, description: "Agent name, slug (e.g. 'aeon', 'bankr'), or 0x wallet address" },
      period: { type: "string", required: false, default: "30d", enum: ["7d", "14d", "30d", "90d"] },
    },
  },
  {
    id: "b20-token-analysis",
    name: "B20 Token Analysis",
    description: "Analyse a B20 token on Base: identity, issuer wallet, linked agent, manifest status, mint/burn activity, and financial readiness. Enforces strict data integrity — token transfers are not revenue, token contracts are not operator wallets.",
    endpoint: "/api/luca/skills/b20-token-analysis",
    method: "POST",
    input: {
      address: { type: "string", required: true, description: "Token contract address (0x...)" },
      agent_slug: { type: "string", required: false, description: "Optional agent slug to correlate" },
      period: { type: "string", required: false, default: "30d", description: "Activity period (informational)" },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    version: "1.0",
    name: "Luca Skills",
    description: "Callable financial intelligence for autonomous agents and builders. Each skill enforces strict data integrity rules.",
    auth: "Authorization: Bearer <api-key>  or  X-API-Key: <api-key>",
    data_integrity: {
      erc8004_role: "identity and discovery only — never financial",
      attribution_rule: "manifest-declared wallets only (evidenceSource: manifest)",
      books_eligible_types: ["eoa", "treasury_contract"],
      excluded_types: ["token_contract", "smart_contract", "proxy_contract", "vault", "unknown"],
      gross_inflow_warning: "gross_inflow_usd is NOT revenue — use revenue-analysis for the operating_revenue figure",
    },
    skills: SKILLS,
    generated_at: new Date().toISOString(),
  });
}
