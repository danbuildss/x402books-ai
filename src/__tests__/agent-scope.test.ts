// Centralized agent-scope enforcement tests.
// An `agent:aeon` key must access AEON's data and nothing else.
// Run with: bun test src/__tests__/agent-scope.test.ts

import { describe, expect, test } from "bun:test";
import { agentScopeViolation } from "@/lib/v1-auth";

describe("agentScopeViolation", () => {
  test("aeon-scoped key can access aeon", () => {
    expect(agentScopeViolation("aeon", "aeon")).toBeNull();
  });

  test("aeon-scoped key cannot access luca", () => {
    const v = agentScopeViolation("aeon", "luca");
    expect(v).not.toBeNull();
    expect(v).toContain("scoped to agent 'aeon'");
  });

  test("aeon-scoped key cannot access any other agent", () => {
    expect(agentScopeViolation("aeon", "bankr")).not.toBeNull();
    expect(agentScopeViolation("aeon", "sleuth-ai")).not.toBeNull();
  });

  test("unscoped key can access anything", () => {
    expect(agentScopeViolation(null, "aeon")).toBeNull();
    expect(agentScopeViolation(null, "luca")).toBeNull();
  });

  test("no requested slug means no per-agent data — nothing to enforce", () => {
    expect(agentScopeViolation("aeon", null)).toBeNull();
    expect(agentScopeViolation("aeon", undefined)).toBeNull();
  });
});
