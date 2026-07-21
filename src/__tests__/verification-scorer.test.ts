// Verification scorer tests — P2 role-vocabulary fix.
// The role-diversity bonus (+5) must fire for the canonical manifest roles
// (treasury | fee | deployer | operator), not just the legacy names that
// real manifests never used.
//
// Run with: bun test src/__tests__/verification-scorer.test.ts

import { describe, expect, test } from "bun:test";
import { scoreAgent, type ScorableAgent } from "../lib/verification-scorer";
import type { AgentWallet } from "../app/registry/types";

function wallet(role: string, address: string): AgentWallet {
  return {
    address,
    label: "candidate wallet",
    role,
    evidenceSource: "manifest",
    address_type: "eoa",
  };
}

function makeAgent(roles: string[]): ScorableAgent {
  return {
    name: "Score Test",
    ecosystem: "BANKR",
    xHandle: "@scoretest",
    website: "https://score.test",
    tokenAddress: "0x1111111111111111111111111111111111111111",
    verificationStatus: "Candidate",
    wallets: roles.map((r, i) => wallet(r, `0x${String(i + 1).repeat(40)}`)),
  };
}

function roleBonusFired(roles: string[]): boolean {
  return scoreAgent(makeAgent(roles), false).signals.includes("Multiple wallet roles declared.");
}

describe("wallet role-diversity bonus", () => {
  test("fires for canonical treasury + fee", () => {
    expect(roleBonusFired(["treasury", "fee"])).toBe(true);
  });

  test("fires for canonical treasury + operator", () => {
    expect(roleBonusFired(["treasury", "operator"])).toBe(true);
  });

  test("still fires for legacy treasury + revenue", () => {
    expect(roleBonusFired(["treasury", "revenue"])).toBe(true);
  });

  test("does not fire for treasury + deployer (deployer is not a flow role)", () => {
    expect(roleBonusFired(["treasury", "deployer"])).toBe(false);
  });

  test("does not fire without a treasury role", () => {
    expect(roleBonusFired(["fee", "operator"])).toBe(false);
  });

  test("role matching is case-insensitive", () => {
    expect(roleBonusFired(["Treasury", "Fee"])).toBe(true);
  });
});

describe("score sanity", () => {
  test("canonical-role manifest scores strictly higher than same manifest without flow role", () => {
    const withBonus = scoreAgent(makeAgent(["treasury", "fee"]), false).total;
    const withoutBonus = scoreAgent(makeAgent(["treasury", "treasury"]), false).total;
    expect(withBonus).toBeGreaterThan(withoutBonus);
  });

  test("total stays within 0-100", () => {
    const vs = scoreAgent(makeAgent(["treasury", "fee", "operator", "deployer"]), true, 100);
    expect(vs.total).toBeGreaterThanOrEqual(0);
    expect(vs.total).toBeLessThanOrEqual(100);
  });
});
