import { NextResponse } from "next/server";
import { v1Auth } from "@/lib/v1-auth";
import { parseLedgerParams, ledgerErrorResponse } from "@/lib/api-utils";
import { buildLedgerScan } from "@/lib/ledger-service";

export async function GET(request: Request) {
  const auth = await v1Auth(request);
  if (!auth.ok) return auth.response;

  const params = parseLedgerParams(request);
  if (params.error) return params.error;

  const start = Date.now();
  try {
    const scan = await buildLedgerScan({ wallet: params.wallet, range: params.range, persist: false });

    const body = {
      wallet: scan.wallet,
      range: scan.range,
      generated_at: scan.generatedAt,
      summary: {
        total_income: scan.summary.totalIncome,
        total_spend: scan.summary.totalSpend,
        net_flow: scan.summary.netFlow,
        transaction_count: scan.summary.transactionCount,
        likely_x402_count: scan.summary.likelyX402Count,
        top_category: scan.summary.topCategory,
        budget_status: scan.report.budgetStatus,
      },
      report: scan.report,
      categories: scan.categories,
      daily_flows: scan.dailyFlows,
      portfolio: scan.portfolio.map((p) => ({
        token_symbol: p.tokenSymbol,
        token_address: p.tokenAddress,
        is_agent_token: p.isAgentToken,
        is_stablecoin: p.isStablecoin,
        usd_inflow: p.usdInflow,
        usd_outflow: p.usdOutflow,
        usd_net_flow: p.usdNetFlow,
        tx_count: p.txCount,
        current_price: p.currentPrice,
        price_change_24h: p.priceChange24h,
        volume_24h: p.volume24h,
      })),
      top_counterparties: scan.summary.topCounterparties,
    };

    auth.finish(200, Date.now() - start, "/api/v1/full-report", params.wallet);
    return NextResponse.json(body);
  } catch (error) {
    auth.finish(502, Date.now() - start, "/api/v1/full-report", params.wallet);
    return ledgerErrorResponse(error);
  }
}
