// P9 — UI messaging rules, enforced.
// Public-facing copy must never overclaim. Hard-banned phrases fail this
// suite outright; "official" is allowed ONLY on lines that tie it to the
// evidence that makes it true (a declared/submitted wallet manifest) — the
// product's own "no manifest, no official books" rule.
//
// Scope: public surfaces only (pages + components). Admin tooling
// (luca-admin) and API route internals are exempt.
//
// Run with: bun test src/__tests__/messaging-rules.test.ts

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");

// Phrases that overclaim no matter the context.
const HARD_BANNED = [/\baudited\b/i, /\breal revenue\b/i, /\bguaranteed\b/i, /\bconfirmed treasury\b/i];

// "official" must co-occur with the evidence condition on the same line.
const CONDITIONED = /\bofficial\b/i;
const EVIDENCE = /manifest|declar|submit/i;

const EXCLUDED_DIRS = new Set(["luca-admin", "api", "__tests__", "node_modules"]);

function publicTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      publicTsxFiles(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const FILES = [
  ...publicTsxFiles(join(ROOT, "app")),
  ...publicTsxFiles(join(ROOT, "components")),
];

describe("P9 messaging rules on public surfaces", () => {
  test("scans a real set of public files (sanity)", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  test("no hard-banned overclaims (audited / real revenue / guaranteed / confirmed treasury)", () => {
    const violations: string[] = [];
    for (const file of FILES) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const banned of HARD_BANNED) {
          if (banned.test(line)) violations.push(`${file.replace(ROOT, "src")}:${i + 1} → ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  test("'official' only appears evidence-conditioned (same line mentions manifest/declared/submit)", () => {
    const violations: string[] = [];
    for (const file of FILES) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (CONDITIONED.test(line) && !EVIDENCE.test(line)) {
          violations.push(`${file.replace(ROOT, "src")}:${i + 1} → ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });
});

// The approved status vocabulary stays intact — these labels are what users
// see, and every one carries a plain-language tooltip (registry-filters tests
// assert the tooltips are non-empty).
import { BOOKS_STATUS_META, PROFILE_STATUS_META, WALLET_STATUS_META } from "../app/registry/filters";

describe("approved status vocabulary", () => {
  test("core approved labels are present in the status metas", () => {
    expect(PROFILE_STATUS_META.candidate.label).toBe("Candidate");
    expect(PROFILE_STATUS_META.needs_verification.label).toBe("Needs Verification");
    expect(PROFILE_STATUS_META.verified.label).toBe("Verified");
    expect(BOOKS_STATUS_META.no_books.label).toBe("No Books");
    expect(BOOKS_STATUS_META.live.label).toBe("Live");
    expect(BOOKS_STATUS_META.stale.label).toBe("Stale");
    expect(WALLET_STATUS_META.declared.label).toBe("Declared");
  });

  test("no status label itself overclaims", () => {
    const allLabels = [
      ...Object.values(PROFILE_STATUS_META),
      ...Object.values(BOOKS_STATUS_META),
      ...Object.values(WALLET_STATUS_META),
    ].map((m) => m.label);
    for (const label of allLabels) {
      for (const banned of HARD_BANNED) expect(banned.test(label)).toBe(false);
      expect(/official/i.test(label)).toBe(false);
    }
  });
});
