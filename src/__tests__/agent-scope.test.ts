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

// ── P8: agent:{slug} key parsing + Bankr end-to-end naming ────────────────────

import { parseAgentScope } from "@/lib/api-keys";
import { toSlug } from "@/lib/slug";

describe("parseAgentScope (agent:{slug} key convention)", () => {
  test("agent:bankr-bot → scope bankr-bot", () => {
    expect(parseAgentScope("agent:bankr-bot")).toBe("bankr-bot");
  });

  test("non-agent key names have no scope (unrestricted)", () => {
    expect(parseAgentScope("my personal key")).toBeNull();
    expect(parseAgentScope("")).toBeNull();
    expect(parseAgentScope("agentx:bankr")).toBeNull();
  });

  test("the security property: a Bankr agent's scoped key is denied every other slug", () => {
    const scope = parseAgentScope("agent:bankr-bot");
    // own data — allowed
    expect(agentScopeViolation(scope, "bankr-bot")).toBeNull();
    // anyone else's data — denied, with a clear error naming both slugs
    for (const other of ["helixa", "clawd", "luca", "bankr"]) {
      const v = agentScopeViolation(scope, other);
      expect(v).not.toBeNull();
      expect(v).toContain("bankr-bot");
      expect(v).toContain(other);
    }
  });

  test("agentName inputs normalize through toSlug before the scope check (agent-report / agent-events routes)", () => {
    const scope = parseAgentScope("agent:bankr-bot");
    // A request for agentName "Bankr Bot" is the same agent → allowed
    expect(agentScopeViolation(scope, toSlug("Bankr Bot"))).toBeNull();
    // A request for agentName "Sleuth.AI" is not → denied
    expect(agentScopeViolation(scope, toSlug("Sleuth.AI"))).not.toBeNull();
  });
});
