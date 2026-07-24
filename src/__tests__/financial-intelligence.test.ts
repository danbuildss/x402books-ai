import { describe, expect, test } from "bun:test";
import { assertBalanced, buildJournal, decideRecognition, reconstructEconomicActions, snapshotIntegrityHash, type EconomicAction } from "@/lib/financial-intelligence";

const action = (overrides: Partial<EconomicAction> = {}): EconomicAction => ({ agentSlug: "agent", walletAddress: "0x1", chain: "base", txHash: "0xabc", actionIndex: 0, actionType: "direct_payment", counterparty: "0x2", grossAmountUsd: 100, feeAmountUsd: 0, occurredAt: "2026-07-24T00:00:00Z", reasonCodes: [], sourceEventIds: [], adapterVersion: "v1", reconstructionConfidence: "deterministic", metadata: {}, ...overrides });

describe("financial intelligence", () => {
  test("groups swap legs into one non-revenue action", () => {
    const actions = reconstructEconomicActions([
      { agentSlug: "agent", walletAddress: "0x1", chain: "base", txHash: "0xa", direction: "out", counterparty: "router", amountUsd: 100, assetSymbol: "USDC", observedAt: "2026-01-01", classification: "dex_trade" },
      { agentSlug: "agent", walletAddress: "0x1", chain: "base", txHash: "0xa", direction: "in", counterparty: "router", amountUsd: 99, assetSymbol: "ETH", observedAt: "2026-01-01", classification: "dex_trade" },
    ]);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe("swap");
    expect(decideRecognition(actions[0]).status).toBe("not_revenue");
  });

  test("wallet payment without commercial proof stays candidate", () => expect(decideRecognition(action()).recognizedAmountUsd).toBe(0));

  test("delivered customer work is recognized and balanced", () => {
    const recognition = decideRecognition(action(), { id: "commercial", eventType: "invoice", status: "delivered", amountUsd: 100, customerRef: "customer", evidence: ["invoice"] });
    expect(recognition.status).toBe("recognized");
    expect(recognition.evidenceGrade).toBe("A");
    const journal = buildJournal(action(), recognition)!;
    expect(() => assertBalanced(journal.lines)).not.toThrow();
  });

  test("prepayment is deferred", () => expect(decideRecognition(action(), { id: "commercial", eventType: "invoice", status: "created", amountUsd: 100, customerRef: "customer", evidence: [] }).status).toBe("deferred"));

  test("snapshot hashes are deterministic", () => {
    const input = { agentSlug: "agent", periodStart: "2026-01-01", periodEnd: "2026-01-31", metrics: { grossPaymentVolumeUsd: 1, recognizedRevenueUsd: 0, collectedRevenueUsd: 0, directCostsUsd: 0, grossProfitUsd: 0, operatingExpensesUsd: 0, operatingProfitUsd: 0, otherIncomeUsd: 0, unresolvedInflowsUsd: 1, refundsUsd: 0, anomalyCount: 0 }, policyVersions: { recognition: "1" } };
    expect(snapshotIntegrityHash(input)).toBe(snapshotIntegrityHash({ ...input, policyVersions: { recognition: "1" } }));
  });
});
