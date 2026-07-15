export type Ecosystem = "BANKR" | "Virtuals" | "Base" | "AEON" | "EigenCloud";

// ── Communication identity types ──────────────────────────────────────────────

export type CommPlatform =
  | "wiretap"
  | "telegram"
  | "x"
  | "email"
  | "discord"
  | "farcaster"
  | "other";

export type CommConfidence = "unverified" | "confirmed";

export type CommLabel =
  | "payment request observed"
  | "settlement not confirmed"
  | "needs wallet confirmation"
  | "reconciliation candidate";

export type CommunicationIdentity = {
  id?: string;
  platform: CommPlatform;
  handle: string;
  url?: string | null;
  confidence: CommConfidence;
  labels: CommLabel[];
  notes?: string | null;
};
// Health values are purely descriptive — based on on-chain activity patterns only.
// No judgment or rating implied.
export type Health = "Active" | "Inactive" | "Unverified" | "Pending" | "Stable";
export type VerificationStatus =
  | "Candidate"
  | "Needs Verification"
  | "Wallets Declared"
  | "Claimed"
  | "Verified"
  | "Luca Managed"
  | "ERC-8004 Indexed"
  | "Awaiting Manifest";
export type WalletLabel =
  | "candidate wallet"
  | "verified wallet"
  | "treasury"
  | "deployer"
  | "likely treasury"
  | "likely revenue wallet"
  | "likely fee recipient"
  | "likely expense wallet"
  | "unknown role";
// ── P0 status-tag vocabulary ──────────────────────────────────────────────────
// Const arrays are the single source of truth: API whitelists and admin
// dropdowns import these so the vocabulary can't drift from the types.
// Every stored tag is CHECK-enforced in the DB (20260715000001/2 migrations).

export const OUTREACH_STATUSES = [
  "not_contacted",
  "dm_sent",
  "replied",
  "interested",
  "manifest_requested",
  "manifest_submitted",
  "books_live",
  "shared_profile",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const FOCUS_STATUSES = ["active_focus"] as const;
export type FocusStatus = (typeof FOCUS_STATUSES)[number];

export const BANKR_PRIORITIES = ["high", "medium", "low"] as const;
export type BankrPriority = (typeof BANKR_PRIORITIES)[number];

export const METADATA_STATUSES = ["complete", "incomplete", "needs_review"] as const;
export type MetadataStatus = (typeof METADATA_STATUSES)[number];

// Trigger-owned in the DB (never written by app code):
export const WALLET_STATUSES = ["none", "candidate", "declared", "verified", "rejected"] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const PROFILE_STATUSES = ["candidate", "needs_verification", "verified"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

// Computed at read time (time-dependent — see src/lib/status-tags.ts):
// "error" and "failed" are reserved; nothing produces them yet.
export const BOOKS_STATUSES = ["no_books", "pending", "live", "stale", "error"] as const;
export type BooksStatus = (typeof BOOKS_STATUSES)[number];

export const DATA_STATUSES = ["fresh", "stale", "partial", "failed"] as const;
export type DataStatus = (typeof DATA_STATUSES)[number];

export type AddressType =
  | "eoa"               // externally owned account — valid operator wallet
  | "token_contract"    // ERC-20/ERC-721 — NEVER an operator wallet
  | "proxy_contract"    // upgradeable proxy — inspect manually
  | "treasury_contract" // Gnosis Safe or similar multi-sig
  | "vault"             // yield vault / liquidity position
  | "smart_contract"    // generic contract — not a valid operator wallet
  | "unknown";          // not yet classified

export type AgentWallet = {
  address: string;
  label: WalletLabel;
  role?: string;          // treasury | fee | deployer | operator | unknown
  chain?: string;         // base | ethereum | solana | etc
  confidence?: string;    // declared | inferred | confirmed
  evidenceSource?: string; // manifest | luca | admin
  notes?: string;
  address_type?: AddressType; // set after classification audit
  booksEligible?: boolean;    // trigger-computed in DB (books_eligible)
};

export type Agent = {
  name: string;
  slug: string;
  symbol: string;
  ecosystem: Ecosystem;
  xHandle: string;
  website: string | null;
  bankrProfile: string | null;
  tokenAddress: string | null;
  isB20Token?: boolean;        // true = confirmed B20 token, eligible for B20 Intelligence indexing
  wallets: AgentWallet[];
  verificationStatus: VerificationStatus;
  evidenceSources: string[];
  treasuryHealth: Health;                // descriptive activity status — not a rating
  outreachStatus: OutreachStatus | null; // internal CRM, not exposed publicly
  // P0 status tags — internal CRM, never exposed in PublicAgent.
  focusStatus: FocusStatus | null;
  bankrPriority: BankrPriority | null;
  metadataStatus: MetadataStatus | null;
  walletStatus: WalletStatus;   // trigger-owned, read-only for app code
  profileStatus: ProfileStatus; // trigger-owned, read-only for app code
  booksStatus: BooksStatus;     // derived at read time
  dataStatus: DataStatus;       // derived at read time
  lastChecked: string | null;
  adminNotes: string | null;             // internal — use lucaVerdict in PublicAgent
  priority: number;                      // internal ranking, not exposed publicly
  pfp?: string;
  gitlawbRepo?: string;
  communicationIdentities?: CommunicationIdentity[]; // internal CRM, not exposed publicly
  erc8004AgentId?: string;
  erc8004MetadataUri?: string;
  erc8004RegistrationTx?: string;
  erc8004Did?: string;
  erc8004Description?: string;
};

// PublicAgent — fields safe to pass to client JS bundle.
// Internal CRM fields (scores, outreach, admin notes, priority) are stripped here.
export type PublicAgent = {
  name: string;
  slug: string;
  symbol: string;
  ecosystem: Ecosystem;
  xHandle: string;
  website: string | null;
  bankrProfile: string | null;
  tokenAddress: string | null;
  wallets: AgentWallet[];
  verificationStatus: VerificationStatus;
  evidenceSources: string[];
  treasuryHealth: Health; // descriptive activity status only — not a rating
  // Derived, non-CRM status tags — safe to expose (P2 terminal columns).
  // CRM fields (outreach/focus/bankrPriority/metadataStatus) must never appear here.
  walletStatus: WalletStatus;
  profileStatus: ProfileStatus;
  booksStatus: BooksStatus;
  dataStatus: DataStatus;
  lastChecked: string | null;
  pfp?: string;
  gitlawbRepo?: string;
  lucaVerdict?: string | null; // product-level analysis, safe to display publicly
};

export function toPublicAgent(a: Agent): PublicAgent {
  return {
    name: a.name,
    slug: a.slug,
    symbol: a.symbol,
    ecosystem: a.ecosystem,
    xHandle: a.xHandle,
    website: a.website,
    bankrProfile: a.bankrProfile,
    tokenAddress: a.tokenAddress,
    wallets: a.wallets,
    verificationStatus: a.verificationStatus,
    evidenceSources: a.evidenceSources,
    treasuryHealth: a.treasuryHealth,
    walletStatus: a.walletStatus,
    profileStatus: a.profileStatus,
    booksStatus: a.booksStatus,
    dataStatus: a.dataStatus,
    lastChecked: a.lastChecked,
    pfp: a.pfp,
    gitlawbRepo: a.gitlawbRepo,
    lucaVerdict: a.adminNotes ?? null,
  };
}
