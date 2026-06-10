# x402Books

**Trust infrastructure for autonomous agents.**

Agents are becoming economic actors — they operate wallets, settle payments, and pay for inference. Before one agent trusts another with money, someone has to answer: *who is this agent, and should I trust it?*

x402Books answers that with one API call.

Live at **[x402books.xyz](https://www.x402books.xyz)**

---

## The stack

| Layer | What it is |
|-------|------------|
| **Trust Check API** | `GET /api/v1/kya/[agent]` — trust score, confidence, risk level, recommendation, evidence |
| **Agent Wallet Manifest** | `.agent/wallets.json` — the open standard for declaring agent financial identity |
| **Agent Registry** | 125+ agents indexed with verified wallets, roles, treasury health, and verdicts |
| **Luca** | The intelligence layer — verifies manifests, computes scores, writes verdicts |
| **Methodology** | Every factor and point value is public: [x402books.xyz/methodology](https://www.x402books.xyz/methodology) |

---

## Trust Check — one call before money moves

```bash
curl -s https://www.x402books.xyz/api/v1/kya/aeon \
  -H "Authorization: Bearer xb_live_..."
```

```json
{
  "agent": "aeon",
  "trust_score": 72,
  "confidence": 68,
  "verification_status": "Wallets Declared",
  "risk_level": "LOW",
  "recommendation": "ALLOW",
  "key_drivers": [
    "treasury + operator wallet roles declared via manifest",
    "Treasury health: Stable"
  ]
}
```

Two numbers on purpose: **trust_score** is how good the agent looks, **confidence** is how much evidence sits behind that. `BLOCK` is reserved for explicit negative signals — absence of data is always `REVIEW`.

Full integration guide: [docs/TRUST-CHECK-API.md](docs/TRUST-CHECK-API.md)

---

## Declare your agent — `.agent/wallets.json`

Add one file to your repo:

```json
{
  "agent": "YourAgent",
  "ecosystem": "Base",
  "wallets": [
    { "address": "0x...", "role": "treasury", "chain": "base" },
    { "address": "0x...", "role": "operator", "chain": "base" }
  ]
}
```

Submit your repo URL at [x402books.xyz/registry](https://www.x402books.xyz/registry). Validated manifests upgrade your profile to **Wallets Declared**, raise your trust score and confidence, and give your agent a live verification badge plus its own Trust Check endpoint.

Verification tiers: `Candidate → Wallets Declared → Claimed → Verified → Luca Managed`

---

## API

**Public, no auth:**

```
GET /api/stats                Registry metrics + trust-check counts
GET /api/badge/[slug]         SVG verification badge
GET /api/registry/agents      All indexed agents
```

**API key (get one at [/developer](https://www.x402books.xyz/developer)):**

```
GET /api/v1/kya/[slug]                 Trust Check — the trust decision
GET /api/v1/agent-financial-state      Treasury health for any wallet
GET /api/v1/agent-report               Financial intelligence report
```

| Tier | Requirement | Requests/day |
|------|-------------|-------------|
| Free | Any API key | 100 |
| Holder | ≥ 1,000 $LUCA | 500 |
| Whale | ≥ 10,000 $LUCA | 2,000 |

API keys are session-owned; wallet tiers require a signed challenge (no address-pasting).

---

## Luca

**Luca** is the intelligence layer of x402Books. He verifies manifests, computes trust and activity scores, writes the verdict on every profile, and publishes the *State of Agent Trust*.

- Telegram: [@AskLucaBot](https://t.me/AskLucaBot)
- X: [@AskLucaAI](https://x.com/AskLucaAI)
- Page: [x402books.xyz/luca](https://www.x402books.xyz/luca)

$LUCA (`0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3`, Base) is the ecosystem token — API tier upgrades and Luca premium features. It is not required to use x402Books.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) — schema + migration ledger in `supabase/` |
| Blockchain | Base — Alchemy, BANKR, Virtuals, Dune |
| AI | Claude (Anthropic) |
| Payments | x402 protocol — HTTP 402, USDC on Base |
| Deploy | Vercel · CI: typecheck + lint + build on every PR |

## Environment variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Blockchain
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

# AI
ANTHROPIC_API_KEY=your_anthropic_key

# x402 / BANKR
BANKR_X402_API_KEY=your_bankr_key
X402BOOKS_INTERNAL_SECRET=your_internal_secret   # internal/admin route auth — fail-closed

# $LUCA token
LUCA_TOKEN_ADDRESS=0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3

# Dune Analytics
DUNE_API_KEY=your_dune_key
```

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SQL schema lives in `supabase/` — see `supabase/MIGRATIONS.md` for what's applied.

## Security

- API keys stored as SHA-256 hashes — raw keys are never persisted; keys are bound to the creating session
- Wallet tier verification requires a signed challenge (viem `verifyMessage`)
- Internal/admin routes fail closed on missing secrets; constant-time token comparison
- Rate limits on all public write endpoints
- Trust Check responses carry an advisory disclaimer — the caller makes the decision
