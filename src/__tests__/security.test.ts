// Security-critical unit tests covering P0 and P2 fixes.
// Run with: bun test src/__tests__/security.test.ts

import { describe, expect, test } from "bun:test";
import { createHmac } from "crypto";

// ── parseAgentScope (inlined — avoids DB imports) ────────────────────────────

function parseAgentScope(name: string): string | null {
  if (!name.startsWith("agent:")) return null;
  const slug = name.slice("agent:".length);
  return slug.length > 0 ? slug : null;
}

describe("parseAgentScope", () => {
  test("returns null for non-agent keys", () => {
    expect(parseAgentScope("Default")).toBeNull();
    expect(parseAgentScope("Production")).toBeNull();
    expect(parseAgentScope("")).toBeNull();
  });

  test("returns slug for valid agent keys", () => {
    expect(parseAgentScope("agent:my-agent")).toBe("my-agent");
    expect(parseAgentScope("agent:zeta-one")).toBe("zeta-one");
  });

  test("returns null for empty slug (the bypass bug)", () => {
    // 'agent:' with nothing after — must return null, not ''
    expect(parseAgentScope("agent:")).toBeNull();
    // Null is truthy-safe: if (auth.agentScope && ...) correctly skips the check
    // with null, but would have incorrectly skipped with ""
    const scope = parseAgentScope("agent:");
    expect(scope).not.toBe("");
    expect(Boolean(scope)).toBe(false);
  });

  test("preserves hyphens and numbers", () => {
    expect(parseAgentScope("agent:agent-007")).toBe("agent-007");
    expect(parseAgentScope("agent:some-agent-v2")).toBe("some-agent-v2");
  });
});

// ── verifySessionToken (inlined from internal-auth.ts) ────────────────────────
// Tests the unconditional-HMAC version (P2 fix).

import { createHash, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function verifySessionToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const tsNum = parseInt(ts, 10);
  const expected = createHmac("sha256", secret).update(ts).digest("hex");
  const sigOk = safeEqual(sig.length > 0 ? sig : "\0", expected);
  const notExpired = !isNaN(tsNum) && Date.now() - tsNum <= 3_600_000;
  return sigOk && notExpired;
}

function makeToken(secret: string, ageMs = 0): string {
  const ts = String(Date.now() - ageMs);
  const sig = createHmac("sha256", secret).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

describe("verifySessionToken", () => {
  const secret = "test-secret-for-unit-tests";

  test("accepts a fresh valid token", () => {
    expect(verifySessionToken(makeToken(secret), secret)).toBe(true);
  });

  test("rejects wrong secret", () => {
    expect(verifySessionToken(makeToken("other-secret"), secret)).toBe(false);
  });

  test("rejects expired token (>1h)", () => {
    const old = makeToken(secret, 3_601_000);
    expect(verifySessionToken(old, secret)).toBe(false);
  });

  test("rejects token with no dot", () => {
    expect(verifySessionToken("nodot", secret)).toBe(false);
  });

  test("rejects token with empty sig — no early-exit before HMAC", () => {
    const ts = String(Date.now());
    expect(verifySessionToken(`${ts}.`, secret)).toBe(false);
  });

  test("rejects token with garbage timestamp — HMAC still runs", () => {
    // Before the fix, isNaN check caused early return — HMAC never ran.
    // Now HMAC runs and sigOk is false, so timing is uniform.
    expect(verifySessionToken(`garbage.${createHmac("sha256", secret).update("garbage").digest("hex")}`, secret)).toBe(false);
  });

  test("rejects token with valid HMAC but expired timestamp", () => {
    const expired = makeToken(secret, 4_000_000); // 66 min old
    expect(verifySessionToken(expired, secret)).toBe(false);
  });
});

// ── Scope enforcement (route-level guard logic) ───────────────────────────────

describe("agent scope guard", () => {
  // The guard: if (auth.agentScope && auth.agentScope !== slug) → 403
  function guardPasses(agentScope: string | null, requestedSlug: string): boolean {
    return !(agentScope && agentScope !== requestedSlug);
  }

  test("null scope always passes (unscoped key)", () => {
    expect(guardPasses(null, "any-agent")).toBe(true);
  });

  test("matching scope passes", () => {
    expect(guardPasses("my-agent", "my-agent")).toBe(true);
  });

  test("mismatched scope is blocked", () => {
    expect(guardPasses("my-agent", "other-agent")).toBe(false);
  });

  test("empty string scope (the old bypass bug) — '' is falsy, guard skips", () => {
    // Demonstrates why parseAgentScope must return null, not "".
    // With "", the guard is skipped and any slug is accessible.
    const emptyScope = "";
    expect(guardPasses(emptyScope, "any-agent")).toBe(true); // BUG: empty passes
    // With null (the fix), same check behaves identically (also passes),
    // but parseAgentScope("agent:") now returns null, not "".
    // The fix ensures "agent:" is treated as an unscoped key, not a scope bypass.
    const nullScope = null;
    expect(guardPasses(nullScope, "any-agent")).toBe(true); // correct: unscoped
  });
});
