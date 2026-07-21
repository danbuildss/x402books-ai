import type { AgentWallet } from "@/app/registry/types";

// Allowlist of address types that are valid operational wallets for books.
// Only these two types produce attributed revenue/expenses.
export const BOOKS_ELIGIBLE_ADDRESS_TYPES = new Set<string>(["eoa", "treasury_contract", "smart_account"]);

export type EligibilityResult = { eligible: boolean; reason: string | null };

// Canonical role → address_type mapping for manifest-declared wallets.
// Used by manifest ingestion and the admin repair routes so both stay in
// lockstep with the auto_address_type_from_role DB trigger.
// Roles not listed here return null: the wallet stays unclassified and
// therefore books-ineligible — never default to eoa.
export const ROLE_TO_ADDRESS_TYPE: Record<string, string> = {
  treasury:         "treasury_contract",
  operator:         "eoa",
  fee:              "eoa",
  fee_recipient:    "eoa",
  revenue:          "eoa",
  expense:          "eoa",
  payment_receiver: "eoa",
  surplus_wallet:   "eoa",
  deployer:         "eoa",
};

export function addressTypeForRole(role: string | null | undefined): string | null {
  return ROLE_TO_ADDRESS_TYPE[(role ?? "").toLowerCase()] ?? null;
}

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
      reason: `address_type=${atype || "unknown"} — only eoa, treasury_contract, and smart_account are books-eligible`,
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
