// P5 pipeline observability tests — pure surface only.
// The stage vocabulary must match the DB CHECK; data_status must reflect a
// live failure; and Etherscan empty must be distinguished from an error.
//
// Run with: bun test src/__tests__/pipeline-observability.test.ts

import { describe, expect, test } from "bun:test";
import { PIPELINE_STAGES, isPipelineStage } from "../lib/pipeline-observability";
import { parseEtherscanStatus } from "../lib/truth-engine/providers/etherscan";
import { deriveDataStatus } from "../lib/status-tags";

const NOW = Date.parse("2026-07-17T12:00:00Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const DAY = 24 * 60 * 60 * 1000;

// ── Stage vocabulary ──────────────────────────────────────────────────────────

describe("PIPELINE_STAGES", () => {
  test("matches the 10 stages in the migration CHECK constraint, in order", () => {
    expect([...PIPELINE_STAGES]).toEqual([
      "agent_indexed",
      "metadata_complete",
      "wallet_declared",
      "wallet_eligible",
      "transactions_fetched",
      "transactions_normalized",
      "transactions_classified",
      "books_generated",
      "profile_updated",
      "luca_report_generated",
    ]);
  });

  test("isPipelineStage guards membership", () => {
    expect(isPipelineStage("books_generated")).toBe(true);
    expect(isPipelineStage("bogus_stage")).toBe(false);
    expect(isPipelineStage("")).toBe(false);
  });
});

// ── data_status failure overlay ───────────────────────────────────────────────

describe("deriveDataStatus with active failure", () => {
  test("an active failure overrides fresh", () => {
    expect(deriveDataStatus(iso(0), NOW, true)).toBe("failed");
  });

  test("an active failure overrides stale and partial", () => {
    expect(deriveDataStatus(iso(30 * DAY), NOW, true)).toBe("failed");
    expect(deriveDataStatus(null, NOW, true)).toBe("failed");
  });

  test("no failure → normal freshness logic (fresh / stale / partial)", () => {
    expect(deriveDataStatus(iso(2 * DAY), NOW, false)).toBe("fresh");
    expect(deriveDataStatus(iso(10 * DAY), NOW, false)).toBe("stale");
    expect(deriveDataStatus(null, NOW, false)).toBe("partial");
  });

  test("defaults to no-failure when the flag is omitted", () => {
    expect(deriveDataStatus(iso(2 * DAY), NOW)).toBe("fresh");
  });
});

// ── Etherscan empty vs error ──────────────────────────────────────────────────

describe("parseEtherscanStatus", () => {
  test("status 1 → ok", () => {
    expect(parseEtherscanStatus("1", "OK").kind).toBe("ok");
  });

  test("'No transactions found' → empty (legit, not an error)", () => {
    expect(parseEtherscanStatus("0", "No transactions found").kind).toBe("empty");
    expect(parseEtherscanStatus("0", "No records found").kind).toBe("empty");
  });

  test("rate-limit / NOTOK → error (must be surfaced, not swallowed as empty)", () => {
    const r = parseEtherscanStatus("0", "Max rate limit reached");
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toContain("rate limit");
  });

  test("blank message on status 0 → error, not silent empty", () => {
    expect(parseEtherscanStatus("0", "").kind).toBe("error");
  });
});
