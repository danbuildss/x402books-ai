import { LedgerReport, LedgerTransaction, TimeRange } from "@/lib/ledger";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

type PersistLedgerParams = {
  wallet: string;
  range: TimeRange;
  transactions: LedgerTransaction[];
  report: LedgerReport;
};

export async function persistLedgerScan(params: PersistLedgerParams) {
  if (!hasSupabaseAdminEnv()) {
    return { persisted: false, reason: "supabase_not_configured" };
  }

  const supabase = getSupabaseAdminClient();
  const walletAddress = params.wallet.toLowerCase();

  const { error: walletError } = await supabase.from("wallets").upsert(
    {
      address: walletAddress,
      last_scanned_at: new Date().toISOString(),
    },
    { onConflict: "address" },
  );

  if (walletError) {
    return { persisted: false, reason: walletError.message };
  }

  if (params.transactions.length) {
    const { error: transactionError } = await supabase.from("transactions").upsert(
      params.transactions.map((transaction) => ({
        wallet_address: walletAddress,
        tx_hash: transaction.txHash,
        timestamp: transaction.timestamp,
        direction: transaction.direction,
        counterparty: transaction.counterparty,
        amount_usdc: transaction.amountUsdc,
        category: transaction.category || "unknown",
        confidence_score: transaction.confidenceScore || 0,
        memo: transaction.memo || null,
        is_likely_x402: Boolean(transaction.isLikelyX402),
        risk_flag: transaction.riskFlag || "none",
      })),
      { onConflict: "wallet_address,tx_hash" },
    );

    if (transactionError) {
      return { persisted: false, reason: transactionError.message };
    }
  }

  const { error: reportError } = await supabase.from("reports").insert({
    wallet_address: walletAddress,
    period: params.range,
    title: params.report.title,
    summary: params.report,
  });

  if (reportError) {
    return { persisted: false, reason: reportError.message };
  }

  return { persisted: true };
}
