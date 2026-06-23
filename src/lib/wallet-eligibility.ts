import type { AgentWallet } from "@/app/registry/types";

// Allowlist of address types that are valid operational wallets for books.
// Only these two types produce attributed revenue/expenses.
export const BOOKS_ELIGIBLE_ADDRESS_TYPES = new Set<string>(["eoa", "treasury_contract"]);

export type EligibilityResult = { eligible: boolean; reason: string | null };

export function isBooksEligibleWallet(
  wallet: AgentWallet,
  agentTokenAddress?: string | null,
): EligibilityResult {
  const src   = (wallet.evidenceSource ?? "").toLowerCase();
  const atype = (wallet.address_type   ?? "").toLowerCase();
  const role  = (wallet.role           ?? "").toLowerCase();

  if (src !== "manifest") {
    return { eligible: false, reason: `evidenceSource=${src || "empty"} — only manifest wallets produce books` };
  }
  if (!BOOKS_ELIGIBLE_ADDRESS_TYPES.has(atype)) {
    return {
      eligible: false,
      reason: `address_type=${atype || "unknown"} — only eoa and treasury_contract are books-eligible`,
    };
  }
  if (agentTokenAddress && wallet.address.toLowerCase() === agentTokenAddress.toLowerCase()) {
    return { eligible: false, reason: "address matches agent token contract" };
  }
  if (role === "token_contract" || role === "token") {
    return { eligible: false, reason: `role=${role} — not an operator wallet` };
  }
  return { eligible: true, reason: null };
}
