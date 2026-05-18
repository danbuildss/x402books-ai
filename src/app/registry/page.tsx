"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/effects";

// ── Agent data — sourced by Luca (Phase 1 + 2 research) ──────────────────────

type WalletRole = "Treasury" | "Operational" | "Deployer" | "Token Contract" | "Fee Recipient";
type Confidence = "Verified" | "Community" | "Unverified";
type Ecosystem  = "BANKR" | "Virtuals" | "Base";
type Health     = "Healthy" | "Stable" | "Watch" | "At Risk" | "Pending";

type Agent = {
  name: string;
  symbol: string;
  ecosystem: Ecosystem;
  wallet: string | null;       // null = wallet discovery pending
  role: WalletRole;
  confidence: Confidence;
  netFlow: string | null;      // from Luca x402Books spot-checks
  txCount: number | null;
  health: Health;
  website: string | null;
  xHandle: string;
  priority: number;            // Luca registry priority score
  lucaNote: string;
  pfp?: string;                // override avatar URL (defaults to unavatar.io)
  gitlawbRepo?: string;        // repo URL if wallet declared via .x402books/wallets.json
};

const AGENTS: Agent[] = [
  // ── Tier 1 ──
  {
    name: "Bankr",
    symbol: "$BNKR",
    ecosystem: "BANKR",
    wallet: "0x136471a34f6ef19fE571ECE32092d827f70b42b3",
    role: "Treasury",
    confidence: "Community",
    netFlow: null,
    txCount: 0,
    health: "Pending",
    website: "https://bankr.bot",
    xHandle: "@bankrbot",
    priority: 94,
    lucaNote: "Two candidates found. Primary: 0x1364…42b3 — BNKR Staking V2 Vault, publicly referenced on X (Medium). Secondary: 0xa2d9…b417 — creator fee-beneficiary example in a Bankr launch flow (Low — likely a user wallet, not protocol treasury). 0 tx in 30d snapshot on vault. Missing: official treasury wallet, multisig/Safe, clear separation of protocol-owned vs user-created fee recipients. Next step: cluster fee-routing patterns from vault + recurring launch destinations, then ask Bankr team to verify main treasury.",
  },
  {
    name: "Virtuals Protocol",
    symbol: "$VIRTUAL",
    ecosystem: "Virtuals",
    wallet: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
    role: "Token Contract",
    confidence: "Community",
    netFlow: "+$284.96",
    txCount: 89,
    health: "Stable",
    website: "https://app.virtuals.io",
    xHandle: "@virtuals_io",
    priority: 92,
    lucaNote: "$VIRTUAL token contract on Base — verified by Coinbase Markets (High). Not a treasury wallet. Missing: protocol treasury, governance wallet/multisig, EconomyOS protocol-owned reserve wallets. Next step: search Virtuals docs/governance for treasury, multisig, Safe, or reserve references — then link to token contract and official docs.",
  },
  {
    name: "Clanker",
    symbol: "$CLANK",
    ecosystem: "Base",
    wallet: "0x750e224756e6831f41568701f1e12267a86a5ba3",
    role: "Fee Recipient",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://www.clanker.world",
    xHandle: "@clanker_world",
    priority: 88,
    lucaNote: "Example Clanker-launched token contract (Low). Clanker Ecosystem Fund (CEF) referenced publicly but no stable treasury address found. No central treasury confirmed. Next step: inspect admin/claim flow and identify recurring protocol-level fee receivers.",
  },
  {
    name: "Gitlawb",
    symbol: "$GITLAWB",
    ecosystem: "Base",
    wallet: "0x5F980Dcfc4c0fa3911554cf5ab288ed0eb13DBa3",
    role: "Token Contract",
    confidence: "Community",
    netFlow: "+$521.58",
    txCount: 48,
    health: "Stable",
    website: "https://playground.gitlawb.com",
    xHandle: "@gitlawb",
    priority: 86,
    lucaNote: "$GITLAWB token contract — strong public attribution on X (High). Not proof of treasury control. Treasury claims exist on X but no direct wallet proof. Missing: official treasury wallet, repo declaration file, DID-to-wallet mapping. Next step: inspect Gitlawb public repos/docs for .x402books/wallets.json or wallet declarations, then request signed proof for main treasury or operator wallet.",
    gitlawbRepo: "https://github.com/gitlawb",
  },

  // ── Tier 2 ──
  {
    name: "Autonolas",
    symbol: "$OLAS",
    ecosystem: "Base",
    wallet: "0xc9F5D4Ee2BEdAB0f1Bc6be4c7571D8e4ee5ed3E6",
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://olas.network",
    xHandle: "@autonolas",
    priority: 83,
    lucaNote: "Community-referenced Omenstrat / Pearl strategy contract. Not an official treasury. DAO/multisig docs needed.",
  },
  {
    name: "Primer Systems",
    symbol: "$PR",
    ecosystem: "Base",
    wallet: "0x7f0d834705f6e991edce01b739b067bdd5d0eb1b",
    role: "Deployer",
    confidence: "Community",
    netFlow: "+$0.018",
    txCount: 1,
    health: "Watch",
    website: "https://primer.systems",
    xHandle: "@primer_systems",
    priority: 82,
    lucaNote: "Two candidates found — strongest wallet-level lead in the top 5. Primary: 0x7f0d…eb1b — deployer + fee-recipient for Primer Pay (Medium, public attribution). Secondary: 0x437E…7b07 — Primer Pay contract itself (Medium). x402Books spot-check: 1 tx / +$0.018 on deployer. Missing: official treasury wallet, full facilitator settlement wallet list, confirmation deployer is still protocol-active. Next step: trace all onchain interactions from Primer Pay contract + deployer, look for recurring settlement/fee-routing, then request team confirmation for treasury + facilitator wallet.",
  },
  {
    name: "Coinbase AgentKit",
    symbol: "—",
    ecosystem: "Base",
    wallet: "0x7D15B47a27d40F6A85a14Ceb634A124F43425cc6",
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: 5,
    health: "Pending",
    website: null,
    xHandle: "@CoinbaseDev",
    priority: 82,
    lucaNote: "WAGENT contract — AgentKit + x402 ecosystem example. Not a Coinbase treasury. Official demo wallet still needed.",
  },
  {
    name: "OpenGradient",
    symbol: "$OPG",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://www.opengradient.ai",
    xHandle: "@OpenGradient",
    priority: 78,
    lucaNote: "No treasury wallet found yet. Explorer at explorer.opengradient.ai. Governance/foundation docs needed.",
  },
  {
    name: "Nookplot",
    symbol: "$NOOK",
    ecosystem: "Base",
    wallet: "0xb233bdffd437e60fa451f62c6c09d3804d285ba3",
    role: "Token Contract",
    confidence: "Community",
    netFlow: "+$0.24",
    txCount: 27,
    health: "Watch",
    website: "https://nookplot.com",
    xHandle: "@nookplot",
    priority: 78,
    lucaNote: "$NOOK token contract — strong public attribution on X (High). Not a treasury wallet. Public narrative references settlement, staking, and guild treasury mechanics. Missing: guild treasury addresses, reward distribution wallets, staking contract mapping, protocol treasury wallet. Next step: inspect Nookplot docs/app flows for guild treasury, staking contracts, reward distribution — then map into treasury/rewards/settlement roles.",
  },

  // ── Tier 3 ──
  {
    name: "Venice",
    symbol: "$VVV",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@AskVenice",
    priority: 74,
    lucaNote: "Inference / agent infra. No treasury wallet found in public search. Official docs and x402 endpoints needed.",
  },
  {
    name: "Ethy",
    symbol: "$ETHY",
    ecosystem: "Virtuals",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@ethy_agent",
    priority: 74,
    lucaNote: "Virtuals trading agent. No wallet found. Virtuals dashboard references and agent-linked disclosures needed.",
  },
  {
    name: "aixbt",
    symbol: "$AIXBT",
    ecosystem: "Virtuals",
    wallet: "0xCBD656Bf982aB86523E851a1Fc518653344beb07",
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://aixbt.tech",
    xHandle: "@aixbt_agent",
    priority: 73,
    lucaNote: "Low-confidence address from public threads. More commentary/intelligence than transparent treasury. @aixbt_labs attestation needed.",
  },
  {
    name: "Xyber",
    symbol: "$XYBER",
    ecosystem: "Base",
    wallet: null,
    role: "Fee Recipient",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@Xyberinc",
    priority: 72,
    lucaNote: "Agent abilities marketplace on Base. No wallet found. Marketplace payment routes and official docs needed.",
  },
  {
    name: "PeptAI",
    symbol: "$PEPT",
    ecosystem: "Base",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@peptai_",
    priority: 72,
    lucaNote: "Autonomous science agents / x402. No wallet found. Agent payment flow disclosures and official docs needed.",
  },
  {
    name: "Helixa",
    symbol: "$HELIXA",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://synagent.helixa.xyz/cred-bureau",
    xHandle: "@helixaxyz",
    priority: 72,
    lucaNote: "Agent identity / reputation via Cred Bureau. No treasury wallet found. Onchain cred flows and signed proof needed.",
  },
  {
    name: "FractionAI",
    symbol: "$FRAC",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@FractionAI_xyz",
    priority: 72,
    lucaNote: "Agent training on Base. No wallet found. App docs and agent deployment disclosures needed.",
  },
  {
    name: "Otto AI",
    symbol: "$OTTO",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@useOttoAI",
    priority: 68,
    lucaNote: "Agent swarms / x402. No wallet found. Official app and x402 flow disclosures needed.",
  },
  {
    name: "Sibyl",
    symbol: "$SIBYL",
    ecosystem: "Virtuals",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@sibylcap",
    priority: 66,
    lucaNote: "Virtuals / agent memory. No wallet found. Virtuals-linked disclosures and official docs needed.",
  },
  {
    name: "Elsa",
    symbol: "$ELSA",
    ecosystem: "Base",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@HeyElsaAI",
    priority: 66,
    lucaNote: "DeFAI / x402 agent. No wallet found. Product docs and x402 endpoint disclosures needed.",
  },
  {
    name: "Freysa",
    symbol: "$FAI",
    ecosystem: "Base",
    wallet: null,
    role: "Treasury",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@freysa_ai",
    priority: 60,
    lucaNote: "Sovereign / cultural agent on Base. No wallet found. Official team disclosure and token docs needed.",
  },

  // ── New — Luca Weekly Brief additions ──
  {
    name: "x402",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Deployer",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://www.x402.org",
    xHandle: "@CoinbaseDev",
    priority: 95,
    lucaNote: "The x402 payment standard is the strongest strategic signal for agent payments on Base. Not a single-wallet project — strongest as a payments infrastructure layer. No official treasury wallet verified. Watch for: spec updates, SDK releases, merchant/API integrations, MCP and agent-tooling references, demo-to-production movement.",
  },
  {
    name: "GAME by Virtuals",
    symbol: "$GAME",
    ecosystem: "Virtuals",
    wallet: null,
    role: "Deployer",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://app.virtuals.io",
    xHandle: "@virtuals_io",
    priority: 84,
    lucaNote: "Agent deployment and monetization layer inside the Virtuals ecosystem. Better as a deployment/product signal than a wallet target today. No official GAME wallet verified. Watch: new launch flows, agent creation tooling updates, docs changes, featured ecosystem partners. The signal may be moving from protocol headlines to the actual layer where agents are deployed and monetized.",
  },
  {
    name: "ElizaOS",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://elizaos.ai",
    xHandle: "@elizaOS",
    priority: 82,
    lucaNote: "Open agent framework with strong GitHub and docs footprint. High relevance via Coinbase AgentKit overlap — one of the clearest paths from 'AI assistant' to 'AI merchant.' No official treasury/project wallet verified. Watch: GitHub commits/releases, plugin ecosystem growth, Base/CDP/Coinbase integration references, onchain action or payment demos.",
  },
  {
    name: "BorrowGuard",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Fee Recipient",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@0X_BankrGuard",
    priority: 78,
    lucaNote: "BorrowGuard x402 API launched on Base — read-only wallet risk analysis, collateral scanning, route comparison. Public positioning around pay-per-call risk scoring. No clearly verified treasury or payment wallet surfaced yet. Watch: x402 payment endpoint references, docs/site pricing page, any posted receiver wallet or merchant address. Risk scoring APIs may be one of the first real revenue layers for agents.",
  },
  {
    name: "EZ Labs",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@ezlabsbuild",
    priority: 76,
    lucaNote: "Public claims of autonomous DEX swaps on Base with pay-per-call agent execution framing and .well-known/agent.json referenced publicly. Good transaction/activity signal. Canonical treasury/payment wallet still unverified. Watch: Basescan tx links, agent manifest endpoint, payment settlement docs, merchant/payment receiver disclosures. Strong 'from chat to execution' content angle.",
  },
  {
    name: "Modulr",
    symbol: "$MODU",
    ecosystem: "Base",
    wallet: null,
    role: "Token Contract",
    confidence: "Community",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: null,
    xHandle: "@Modulr402",
    priority: 75,
    lucaNote: "x402-native AI component marketplace. Public launch posts around marketplace progress and $MODU. Project account publicly declared official CA updated across website/X/GitHub — strongest explicit contract-level signal among new additions. Still separate from verified treasury wallet. Watch: official website contract page, GitHub references, checkout/payment receiver path, any merchant wallet disclosure.",
  },
  {
    name: "AgentCash",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Fee Recipient",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://agentcash.dev",
    xHandle: "@agentcashdev",
    priority: 74,
    lucaNote: "Demand-side x402: agents can buy APIs and tools with one balance. Strong agent-payments relevance — one of the cleanest public examples of agents paying for things on Base. No verified official treasury/payment wallet surfaced. Watch: changes to supported APIs/providers, site claims about pay-per-call usage, GitHub/org updates. Best content angle: what agents want to buy, not just how they pay.",
  },
  {
    name: "ChainWard",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Operational",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://chainward.ai",
    xHandle: "@chainwardai",
    priority: 73,
    lucaNote: "Base Agent Observatory — publicly tracks agent wallets, alerting and integration layer for onchain agent activity. Strong monitoring/data angle. No verified ChainWard treasury wallet identified. Useful as an observability layer for Luca: before auditing agents, you need watchtowers. Watch: observatory counts, repo pushes, alerting/integration changes, monitored-wallet count.",
  },
  {
    name: "OpenClaude",
    symbol: "—",
    ecosystem: "Base",
    wallet: null,
    role: "Deployer",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://openclaude.gitlawb.com",
    xHandle: "@gitlawb",
    priority: 71,
    lucaNote: "Open agent infra stack built on Gitlawb. High relevance: agent identity + wallet declaration could become the missing accounting layer for open agents. Gitlawb public materials and contracts are discoverable but no OpenClaude-specific verified treasury or revenue wallet confirmed. Watch: repo pushes/stars, Gitlawb stack updates, wallet declaration standards in Gitlawb repos.",
  },
  {
    name: "LUNA",
    symbol: "$LUNA",
    ecosystem: "Virtuals",
    wallet: "0x55cD6469F597452B5A7536e2CD98fC2AdEa52270",
    role: "Token Contract",
    confidence: "Unverified",
    netFlow: null,
    txCount: null,
    health: "Pending",
    website: "https://app.virtuals.io/virtuals/68",
    xHandle: "@virtuals_io",
    priority: 68,
    lucaNote: "IP agent on Virtuals — candidate token contract from Virtuals app listing (Low confidence). Good case study for IP agents vs functional agents: can Luca explain the financial difference? Wallet ownership not verified. Treat as candidate agent profile, not official wallet mapping. Watch: agent page changes, whitepaper references to LUNA, token/activity changes on the app page.",
  },
];

const walletCount = AGENTS.filter((a) => a.wallet !== null).length;

const STATS = [
  { label: "Agents Tracked",   value: String(AGENTS.length) },
  { label: "Ecosystems",       value: "3"                   },
  { label: "Wallets Indexed",  value: String(walletCount)   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function xPfpUrl(handle: string) {
  return `https://unavatar.io/x/${handle.replace("@", "")}`;
}

function AgentAvatar({ agent }: { agent: Agent }) {
  const [failed, setFailed] = useState(false);
  const src = agent.pfp ?? xPfpUrl(agent.xHandle);
  if (failed) {
    return <div className="reg-agent-avatar">{agent.name[0]}</div>;
  }
  return (
    <Image
      src={src}
      alt={agent.name}
      width={32}
      height={32}
      className="reg-agent-avatar reg-agent-avatar-img"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

function ConfidenceBadge({ c }: { c: Confidence }) {
  return (
    <span className={`reg-badge reg-confidence reg-confidence-${c.toLowerCase()}`}>
      {c === "Verified" && <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>}
      {c}
    </span>
  );
}

function RoleBadge({ role }: { role: WalletRole }) {
  const slug = role.toLowerCase().replace(" ", "-");
  return <span className={`reg-badge reg-role reg-role-${slug}`}>{role}</span>;
}

function EcoBadge({ eco }: { eco: Ecosystem }) {
  return <span className={`reg-badge reg-eco reg-eco-${eco.toLowerCase()}`}>{eco}</span>;
}

function HealthBadge({ h }: { h: Health }) {
  const cls = h === "Healthy" ? "healthy" : h === "Stable" ? "stable" : h === "Watch" ? "watch" : h === "At Risk" ? "risk" : "pending";
  return <span className={`reg-health reg-health-${cls}`}>{h}</span>;
}

// ── Verify CTA ────────────────────────────────────────────────────────────────

const WALLETS_JSON_EXAMPLE = `{
  "agent": "Your Agent Name",
  "xHandle": "@yourhandle",
  "ecosystem": "Base",
  "wallets": [
    {
      "address": "0x...",
      "role": "treasury",
      "chain": "base",
      "notes": "Main protocol treasury"
    },
    {
      "address": "0x...",
      "role": "fee_recipient",
      "chain": "base"
    }
  ]
}`;

function VerifyCTA() {
  const [tab, setTab] = useState<"manual" | "gitlawb">("gitlawb");
  const [form, setForm] = useState({ agent_name: "", wallet_address: "", x_handle: "", notes: "", gitlawb_repo: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/registry/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string; duplicate?: boolean };
      if (data.ok) {
        setState("done");
        setMsg(data.duplicate ? "Already submitted — we'll review it soon." : "Submitted! We'll verify and add your agent.");
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Network error. Please try again.");
    }
  }

  function copySchema() {
    navigator.clipboard.writeText(WALLETS_JSON_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="reg-verify" id="verify">
      <div className="reg-verify-inner">
        {/* Left: copy */}
        <div className="reg-verify-text">
          <p className="reg-label">For Agent Teams</p>
          <h2 className="reg-h2">Verify your agent wallet.</h2>
          <p className="reg-verify-sub">
            Submit your wallet for verification and get a Luca-powered audit and Verified badge in the registry.
          </p>
          <div className="reg-verify-perks">
            {[
              "Verified badge on your listing",
              "Luca-powered audit example",
              "Listed across x402Books platform",
            ].map((p) => (
              <div key={p} className="reg-verify-perk">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--accent)" }}>check_circle</span>
                {p}
              </div>
            ))}
          </div>

          {/* Trust ladder */}
          <div className="reg-trust-ladder">
            <p className="reg-trust-ladder-label">Trust levels</p>
            <div className="reg-trust-step">
              <span className="reg-badge reg-confidence reg-confidence-unverified">Unverified</span>
              <span>Luca found candidate wallets from public data</span>
            </div>
            <div className="reg-trust-arrow">↓</div>
            <div className="reg-trust-step">
              <span className="reg-badge reg-confidence reg-confidence-community">Community</span>
              <span>Team submitted or repo-declared wallets</span>
            </div>
            <div className="reg-trust-arrow">↓</div>
            <div className="reg-trust-step">
              <span className="reg-badge reg-confidence reg-confidence-verified">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>verified</span>
                Verified
              </span>
              <span>DID-linked proof via Gitlawb</span>
            </div>
          </div>
        </div>

        {/* Right: tabbed form */}
        <div className="reg-verify-form-wrap">
          {state === "done" ? (
            <div className="reg-submit-success">
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--accent)" }}>check_circle</span>
              <p>{msg}</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="reg-verify-tabs">
                <button
                  type="button"
                  className={`reg-verify-tab${tab === "gitlawb" ? " active" : ""}`}
                  onClick={() => setTab("gitlawb")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Verify via Gitlawb
                </button>
                <button
                  type="button"
                  className={`reg-verify-tab${tab === "manual" ? " active" : ""}`}
                  onClick={() => setTab("manual")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                  Manual Submit
                </button>
              </div>

              {tab === "gitlawb" ? (
                <div className="reg-gitlawb-panel">
                  <p className="reg-gitlawb-intro">
                    Add a <code className="reg-code">.x402books/wallets.json</code> file to your Gitlawb or GitHub repo to declare your agent&apos;s wallets. Luca will detect it and upgrade your registry confidence level.
                  </p>

                  {/* Steps */}
                  <ol className="reg-gitlawb-steps">
                    <li>
                      <span className="reg-step-num">1</span>
                      <div>
                        <strong>Create the file</strong>
                        <p>Add <code className="reg-code">.x402books/wallets.json</code> to your repo root</p>
                      </div>
                    </li>
                    <li>
                      <span className="reg-step-num">2</span>
                      <div>
                        <strong>Declare your wallets</strong>
                        <p>Use the schema below — treasury, revenue, expense, deployer</p>
                      </div>
                    </li>
                    <li>
                      <span className="reg-step-num">3</span>
                      <div>
                        <strong>Submit your repo URL</strong>
                        <p>Luca will verify and upgrade your listing</p>
                      </div>
                    </li>
                  </ol>

                  {/* Schema */}
                  <div className="reg-schema-wrap">
                    <div className="reg-schema-header">
                      <span className="reg-schema-filename">.x402books/wallets.json</span>
                      <button type="button" className="reg-copy-btn" onClick={copySchema}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {copied ? "check" : "content_copy"}
                        </span>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="reg-schema-code">{WALLETS_JSON_EXAMPLE}</pre>
                  </div>

                  {/* Repo submit */}
                  <form className="reg-verify-form" onSubmit={submit}>
                    <div className="reg-field">
                      <label>Agent Name</label>
                      <input type="text" placeholder="e.g. Bankr" value={form.agent_name}
                        onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                    </div>
                    <div className="reg-field">
                      <label>Wallet Address <span className="reg-field-opt">(primary wallet)</span></label>
                      <input type="text" placeholder="0x…" value={form.wallet_address}
                        onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))} required />
                    </div>
                    <div className="reg-field">
                      <label>Gitlawb / GitHub Repo URL <span className="reg-field-opt">(where wallets.json lives)</span></label>
                      <input type="text" placeholder="https://github.com/yourorg/yourrepo" value={form.gitlawb_repo}
                        onChange={(e) => setForm((f) => ({ ...f, gitlawb_repo: e.target.value }))} />
                    </div>
                    {state === "error" && <p className="reg-form-error">{msg}</p>}
                    <button type="submit" className="reg-submit-btn" disabled={state === "loading"}>
                      {state === "loading" ? "Submitting…" : "Submit via Gitlawb"}
                    </button>
                  </form>
                </div>
              ) : (
                <form className="reg-verify-form" onSubmit={submit}>
                  <div className="reg-field">
                    <label>Agent Name</label>
                    <input type="text" placeholder="e.g. Bankr" value={form.agent_name}
                      onChange={(e) => setForm((f) => ({ ...f, agent_name: e.target.value }))} required />
                  </div>
                  <div className="reg-field">
                    <label>Wallet Address</label>
                    <input type="text" placeholder="0x…" value={form.wallet_address}
                      onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))} required />
                  </div>
                  <div className="reg-field">
                    <label>X / Twitter Handle <span className="reg-field-opt">(optional)</span></label>
                    <input type="text" placeholder="@handle" value={form.x_handle}
                      onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))} />
                  </div>
                  <div className="reg-field">
                    <label>Notes <span className="reg-field-opt">(optional)</span></label>
                    <textarea placeholder="Wallet role, ecosystem, anything we should know…" rows={3}
                      value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {state === "error" && <p className="reg-form-error">{msg}</p>}
                  <button type="submit" className="reg-submit-btn" disabled={state === "loading"}>
                    {state === "loading" ? "Submitting…" : "Submit for Verification"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Luca Audit Example ────────────────────────────────────────────────────────

function LucaExample() {
  return (
    <section className="reg-section" id="audit-example">
      <div className="reg-section-head">
        <p className="reg-label">Powered by Luca</p>
        <h2 className="reg-h2">What an agent audit looks like.</h2>
        <p className="reg-section-sub">Luca runs the audit, categorizes transactions, scores treasury health, and flags anomalies — instantly.</p>
      </div>
      <div className="reg-audit-wrap">
        <div className="reg-audit-card">
          <div className="reg-audit-header">
            <div className="reg-audit-header-left">
              <span className="reg-audit-tag">Agent Wallet Audit</span>
              <span className="reg-audit-by">by Luca · x402Books AI</span>
            </div>
            <EcoBadge eco="Base" />
          </div>
          <div className="reg-audit-body">
            <div className="reg-audit-row"><span>Agent</span><strong>Gitlawb</strong></div>
            <div className="reg-audit-row"><span>Token</span><strong>$GITLAWB</strong></div>
            <div className="reg-audit-row"><span>Wallet</span><strong className="reg-mono">0x5F98…3DBa3</strong></div>
            <div className="reg-audit-row"><span>Role</span><RoleBadge role="Token Contract" /></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-row"><span>Transactions (30d)</span><strong>48</strong></div>
            <div className="reg-audit-row"><span>Net Flow (30d)</span><strong className="reg-positive">+$521.58</strong></div>
            <div className="reg-audit-row"><span>Treasury Health</span><HealthBadge h="Stable" /></div>
            <div className="reg-audit-row"><span>Confidence</span><ConfidenceBadge c="Community" /></div>
            <div className="reg-audit-divider" />
            <div className="reg-audit-read">
              <span className="reg-audit-read-label">Luca&apos;s read</span>
              <p>Token contract with consistent 30-day activity and positive net flow. Strong public attribution on X. Treasury wallet claims exist but no direct wallet proof yet — verification recommended before upgrade to Verified status.</p>
            </div>
          </div>
          <div className="reg-audit-footer">
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer" className="reg-audit-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Audit your agent — @AskLucaBot
            </a>
            <Link href="/luca" className="reg-audit-learn">Learn about Luca →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [search, setSearch]       = useState("");
  const [ecoFilter, setEcoFilter] = useState<"All" | "BANKR" | "Virtuals" | "Base">("All");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const filtered = AGENTS.filter((a) => {
    const matchEco = ecoFilter === "All" || a.ecosystem === ecoFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      a.name.toLowerCase().includes(q) ||
      a.symbol.toLowerCase().includes(q) ||
      a.xHandle.toLowerCase().includes(q);
    return matchEco && matchSearch;
  });

  return (
    <div className="reg-page">
      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="/" className="lp-brand"><Logo /></Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/registry" style={{ color: "var(--accent)" }}>Registry</Link>
          <Link href="/luca">Luca</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="lp-header-right">
          <ThemeToggle />
          <Link href="/access" className="lp-btn-ghost lp-signin-desktop">Sign In</Link>
          <Link href="/dashboard" className="lp-btn-primary">Open App</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="reg-hero">
        <p className="reg-label">Agent Financial Registry</p>
        <h1 className="reg-h1">Track the wallets behind agents.</h1>
        <p className="reg-hero-sub">
          x402Books AI indexes agent wallets across Base, BANKR, and Virtuals —
          sourced and scored by Luca. All entries start as Unverified candidates
          until teams submit wallet proof.
        </p>
        <div className="reg-hero-stats">
          {STATS.map((s) => (
            <div key={s.label} className="reg-hero-stat">
              <span className="reg-hero-stat-val">{s.value}</span>
              <span className="reg-hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="reg-hero-actions">
          <a href="#verify" className="lp-btn-primary">Verify Your Agent</a>
          <a href="#agents" className="lp-btn-ghost">Browse Registry</a>
        </div>
      </section>

      {/* ── Agent Table ── */}
      <section className="reg-section" id="agents">
        <div className="reg-table-controls">
          <div className="reg-search-wrap">
            <span className="material-symbols-outlined reg-search-icon">search</span>
            <input className="reg-search" type="text" placeholder="Search agents…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="reg-eco-filter">
            {(["All", "BANKR", "Virtuals", "Base"] as const).map((opt) => (
              <button key={opt} type="button"
                className={`reg-eco-btn${ecoFilter === opt ? " active" : ""}`}
                onClick={() => setEcoFilter(opt)}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="reg-table-wrap">
          <table className="reg-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Ecosystem</th>
                <th>Candidate Wallet</th>
                <th>Role</th>
                <th>Confidence</th>
                <th>Net Flow (30d)</th>
                <th>Health</th>
                <th>Luca&apos;s Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="reg-empty">No agents match your search.</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.name}>
                    <td>
                      <div className="reg-agent-cell">
                        <AgentAvatar agent={a} />
                        <div>
                          <div className="reg-agent-name">
                            {a.name}
                            {a.website && (
                              <a href={a.website} target="_blank" rel="noreferrer" className="reg-ext-link" title="Website">
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                              </a>
                            )}
                            <a href={`https://x.com/${a.xHandle.replace("@","")}`} target="_blank" rel="noreferrer" className="reg-ext-link" title={a.xHandle}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </a>
                            {a.gitlawbRepo && (
                              <a href={a.gitlawbRepo} target="_blank" rel="noreferrer" className="reg-gitlawb-badge" title="Wallet declared via Gitlawb repo">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                                </svg>
                                Gitlawb
                              </a>
                            )}
                          </div>
                          <div className="reg-agent-sym">{a.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td><EcoBadge eco={a.ecosystem} /></td>
                    <td>
                      {a.wallet
                        ? <span className="reg-mono reg-wallet">{truncate(a.wallet)}</span>
                        : <span className="reg-wallet-pending">Discovery pending</span>
                      }
                    </td>
                    <td><RoleBadge role={a.role} /></td>
                    <td><ConfidenceBadge c={a.confidence} /></td>
                    <td>
                      {a.netFlow
                        ? <span className="reg-positive">{a.netFlow}</span>
                        : <span className="reg-muted">—</span>
                      }
                    </td>
                    <td><HealthBadge h={a.health} /></td>
                    <td>
                      <button
                        type="button"
                        className="reg-note-btn"
                        onClick={() => setExpandedNote(expandedNote === a.name ? null : a.name)}
                        title="View Luca's note"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {expandedNote === a.name ? "expand_less" : "notes"}
                        </span>
                      </button>
                      {expandedNote === a.name && (
                        <div className="reg-note-popup">{a.lucaNote}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="reg-table-note">
          All wallet addresses are candidate addresses sourced by Luca from public data. Nothing is Verified until an agent team submits proof.{" "}
          <a href="#verify">Submit your agent wallet →</a>
        </p>
      </section>

      {/* ── Luca Audit Example ── */}
      <LucaExample />

      {/* ── Verify CTA ── */}
      <VerifyCTA />

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Product</p>
            <Link href="/dashboard">App</Link>
            <Link href="/registry">Registry</Link>
            <Link href="/luca">Meet Luca</Link>
            <Link href="/developer">Developer</Link>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Docs</p>
            <Link href="/docs#api">API Reference</Link>
            <Link href="/docs#agent">Agent Guide</Link>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">@AskLucaBot</a>
          </div>
          <div className="lp-footer-col">
            <p className="lp-footer-heading">Community</p>
            <a href="https://x.com/x402Books" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://t.me/AskLucaBot" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 x402Books AI. Not financial advice.</p>
      </footer>
    </div>
  );
}
