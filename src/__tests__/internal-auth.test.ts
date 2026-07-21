// Tests for the shared admin auth helper. All admin routes — including
// /api/admin/revenue-audit, which previously used a raw string compare against
// only the legacy secret — must authenticate through internalAuth.
// Run with: bun test src/__tests__/internal-auth.test.ts

import { afterEach, describe, expect, test } from "bun:test";
import { internalAuth } from "@/lib/internal-auth";

function reqWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/admin/revenue-audit", { headers });
}

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env.ZETTA_INTERNAL_SECRET = ORIGINAL_ENV.ZETTA_INTERNAL_SECRET;
  process.env.X402BOOKS_INTERNAL_SECRET = ORIGINAL_ENV.X402BOOKS_INTERNAL_SECRET;
  process.env.ALLOW_DEV_NOAUTH = ORIGINAL_ENV.ALLOW_DEV_NOAUTH;
});

describe("internalAuth", () => {
  test("accepts the primary secret via Authorization bearer", () => {
    process.env.ZETTA_INTERNAL_SECRET = "primary-secret";
    delete process.env.X402BOOKS_INTERNAL_SECRET;
    expect(internalAuth(reqWith({ authorization: "Bearer primary-secret" }))).toBe(true);
  });

  test("accepts the primary secret via x-internal-secret header", () => {
    process.env.ZETTA_INTERNAL_SECRET = "primary-secret";
    delete process.env.X402BOOKS_INTERNAL_SECRET;
    expect(internalAuth(reqWith({ "x-internal-secret": "primary-secret" }))).toBe(true);
  });

  test("still works when only the legacy secret is configured (migration path)", () => {
    delete process.env.ZETTA_INTERNAL_SECRET;
    process.env.X402BOOKS_INTERNAL_SECRET = "legacy-secret";
    expect(internalAuth(reqWith({ "x-internal-secret": "legacy-secret" }))).toBe(true);
  });

  test("rejects a wrong secret", () => {
    process.env.ZETTA_INTERNAL_SECRET = "primary-secret";
    expect(internalAuth(reqWith({ "x-internal-secret": "wrong" }))).toBe(false);
    expect(internalAuth(reqWith({ authorization: "Bearer wrong" }))).toBe(false);
  });

  test("rejects a missing token", () => {
    process.env.ZETTA_INTERNAL_SECRET = "primary-secret";
    expect(internalAuth(reqWith({}))).toBe(false);
  });

  test("fails closed when no secret is configured", () => {
    delete process.env.ZETTA_INTERNAL_SECRET;
    delete process.env.X402BOOKS_INTERNAL_SECRET;
    delete process.env.ALLOW_DEV_NOAUTH;
    expect(internalAuth(reqWith({ "x-internal-secret": "anything" }))).toBe(false);
  });
});
