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
export type OutreachStatus = "Not started" | "In progress" | "Connected" | "Manifest submitted";

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
};

export type Agent = {
  name: string;
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
  symbol: string;
  ecosystem: Ecosystem;
  xHandle: string;
  website: string | null;
  bankrProfile: string | null;
  tokenAddress: string | null;
  wallets: AgentWallet[];
  verificationStatus: VerificationStatus;
  evidenceSources: string[];
  pfp?: string;
  gitlawbRepo?: string;
  lucaVerdict?: string | null; // product-level analysis, safe to display publicly
};

export function toPublicAgent(a: Agent): PublicAgent {
  return {
    name: a.name,
    symbol: a.symbol,
    ecosystem: a.ecosystem,
    xHandle: a.xHandle,
    website: a.website,
    bankrProfile: a.bankrProfile,
    tokenAddress: a.tokenAddress,
    wallets: a.wallets,
    verificationStatus: a.verificationStatus,
    evidenceSources: a.evidenceSources,
    pfp: a.pfp,
    gitlawbRepo: a.gitlawbRepo,
    lucaVerdict: a.adminNotes ?? null,
  };
}
