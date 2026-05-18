// Agent financial state — designed for AI agents querying their own wallet health.
// Returns a structured snapshot: ecosystem, token portfolio, flows, top counterparties,
// x402 activity, and recent transactions.

import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { ledgerErrorResponse } from "@/lib/api-utils";
import { buildLedgerScan } from "@/lib/ledger-service";
import { isValidWalletAddress, type TimeRange } from "@/lib/ledger";
import { getEcosystemRegistry, isInEcosystem } from "@/lib/ecosystem-tokens";

const VALID_RANGES = new Set(["7d", "14d", "30d", "90d"]);

export async function GET(request: Request) {
  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const wallet = (searchParams.get("wallet") ?? "").trim();
  const range = (searchParams.get("range") ?? "30d") as TimeRange;

  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }
  if (!VALID_RANGES.has(range)) {
    return NextResponse.json({ error: "Range must be 7d, 14d, 30d, or 90d." }, { status: 400 });
  }

  const start = Date.now();
  try {
    const [scan, registry] = await Promise.all([
      buildLedgerScan({ wallet, range, persist: false }),
      getEcosystemRegistry().catch(() => ({ addresses: new Set<string>(), symbols: new Set<string>() })),
    ]);

    // Detect which ecosystem this agent belongs to
    const agentTokens = scan.portfolio.filter((p) => p.isAgentToken && !p.isStablecoin);
    const primaryToken = agentTokens.sort((a, b) => (b.usdInflow + b.usdOutflow) - (a.usdInflow + a.usdOutflow))[0];

    let ecosystem: "BANKR" | "VIRTUALS" | null = null;
    if (primaryToken) {
      const inBankr = registry.symbols.has(primaryToken.tokenSymbol.toUpperCase()) &&
        !["VIRTUAL", "VIRTUALS", "LUNA", "AIXBT", "GAME", "VADER", "CLANKER"].includes(primaryToken.tokenSymbol.toUpperCase());
      ecosystem = inBankr ? "BANKR" : isInEcosystem(primaryToken.tokenAddress, primaryToken.tokenSymbol, registry) ? "VIRTUALS" : null;
    }

    const body = {
      wallet: scan.wallet,
      range: scan.range,
      generated_at: scan.generatedAt,
      ecosystem,
      financial_health: {
        total_income_usd: scan.summary.totalIncome,
        total_spend_usd: scan.summary.totalSpend,
        net_flow_usd: scan.summary.netFlow,
        budget_status: scan.report.budgetStatus,
        transaction_count: scan.summary.transactionCount,
        x402_payment_count: scan.summary.likelyX402Count,
        top_spend_category: scan.summary.topCategory,
      },
      token_portfolio: scan.portfolio
        .filter((p) => p.usdInflow + p.usdOutflow > 0)
        .map((p) => ({
          symbol: p.tokenSymbol,
          address: p.tokenAddress,
          is_agent_token: p.isAgentToken,
          is_stablecoin: p.isStablecoin,
          usd_inflow: p.usdInflow,
          usd_outflow: p.usdOutflow,
          usd_net: p.usdNetFlow,
          tx_count: p.txCount,
          price_usd: p.currentPrice ?? null,
          price_change_24h: p.priceChange24h ?? null,
        })),
      top_counterparties: scan.summary.topCounterparties.slice(0, 5).map((c) => ({
        address: c.address,
        transaction_count: c.count,
        total_usd: c.totalUsdc,
      })),
      recent_transactions: scan.transactions.slice(0, 10).map((tx) => ({
        tx_hash: tx.txHash,
        timestamp: tx.timestamp,
        direction: tx.direction,
        counterparty: tx.counterparty,
        token: tx.tokenSymbol,
        amount_usd: tx.usdValue ?? tx.amountUsdc,
        category: tx.category ?? "unknown",
        is_x402: Boolean(tx.isLikelyX402),
      })),
    };

    auth.finish(200, Date.now() - start, "/api/v1/agent-financial-state", wallet);
    return NextResponse.json(body);
  } catch (error) {
    auth.finish(502, Date.now() - start, "/api/v1/agent-financial-state", wallet);
    return ledgerErrorResponse(error);
  }
}
