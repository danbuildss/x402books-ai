import { describe, expect, test } from "bun:test";
import { normalizeWalletGraph } from "@/lib/truth-engine/wallet-graph";
import { parseManifest, validateManifest } from "@/lib/truth-engine/manifest-validator";

const EVM = "0x1111111111111111111111111111111111111111";
const SOL = "FsNvbX2w3h69tZgdUZgKx9PFgMWPnw78BBRrgiG7dZBw";

describe("canonical manifest validation", () => {
  test("accepts chain-specific EVM and Solana addresses", () => {
    const result = validateManifest({
      agent: "test-agent",
      wallets: [
        { address: EVM, chain: "base", role: "settlement" },
        { address: SOL, chain: "solana", role: "treasury" },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("rejects an EVM address as Solana", () => {
    const result = validateManifest({ agent: "test", wallets: [{ address: EVM, chain: "solana", role: "treasury" }] });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "ADDRESS_INVALID_FOR_CHAIN")).toBe(true);
  });

  test("rejects duplicate chain/address wallets across roles", () => {
    const result = validateManifest({
      agent: "test",
      wallets: [
        { address: EVM, chain: "base", role: "treasury" },
        { address: EVM.toUpperCase().replace("0X", "0x"), chain: "base", role: "settlement" },
      ],
    });
    expect(result.issues.some((issue) => issue.code === "WALLET_DUPLICATE")).toBe(true);
  });

  test("enforces wallet validity and revocation lifecycle", () => {
    const result = validateManifest({
      agent: "test",
      wallets: [{
        address: EVM, chain: "base", role: "treasury", status: "revoked",
        valid_from: "2026-02-01T00:00:00Z", valid_until: "2026-01-01T00:00:00Z",
      }],
    });
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("VALIDITY_RANGE_INVALID");
    expect(codes).toContain("REVOCATION_DATE_REQUIRED");
  });

  test("separates repository declaration from cryptographic control proof", () => {
    const manifest = parseManifest({
      agent: "test",
      wallets: [{ address: EVM, chain: "base", role: "settlement", control_proof: "none" }],
    });
    const graph = normalizeWalletGraph(manifest);
    expect(graph.wallets[0].evidence_status).toBe("attributed");
    expect(graph.wallets[0].control_status).toBe("unverified");
  });
});
