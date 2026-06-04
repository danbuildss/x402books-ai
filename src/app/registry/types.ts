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
export type Health = "Healthy" | "Stable" | "Watch" | "At Risk" | "Pending";
export type VerificationStatus = "Candidate" | "Needs Verification" | "Wallets Declared" | "Claimed" | "Verified" | "Luca Managed";
export type WalletLabel =
  | "candidate wallet"
  | "verified wallet"
  | "likely treasury"
  | "likely revenue wallet"
  | "likely fee recipient"
  | "likely expense wallet"
  | "unknown role";
export type OutreachStatus = "Not started" | "In progress" | "Connected";

export type AgentWallet = {
  address: string;
  label: WalletLabel;
  notes?: string;
};

export type Agent = {
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
  financialActivityScore: number | null; // 0–100
  treasuryHealth: Health;
  partnershipFitScore: number | null;    // 0–100
  outreachStatus: OutreachStatus | null;
  lastChecked: string | null;
  adminNotes: string | null;
  priority: number;
  pfp?: string;
  gitlawbRepo?: string;
  communicationIdentities?: CommunicationIdentity[];
};
