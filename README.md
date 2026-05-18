# x402Books AI

**Readable books for the agent economy.**

x402Books AI is an onchain accounting platform for autonomous agents and their operators. It turns Base wallet activity into clean financial reports, categorized transactions, financial health scores, and agent-readable summaries — powered by the x402 payment protocol.

Live at **[x402books.xyz](https://x402books.xyz)**

---

## Ecosystem

| Layer | Role |
|-------|------|
| **x402Books AI** | The platform — wallet audits, reports, financial intelligence |
| **Luca** | The AI accountant agent — Telegram, onchain, conversational |
| **$LUCA** | The unified ecosystem token — API tiers, premium features, agent credits |

---

## What It Does

- **Wallet Audits** — Scan any Base wallet address and get a complete financial breakdown
- **Transaction Categorization** — AI classifies every onchain transaction: revenue, expenses, gas, swaps, treasury movement
- **Financial Scoring** — Treasury health scores, inflow/outflow analysis, anomaly detection
- **Agent Reports** — Structured summaries built for agents, operators, and on-chain bookkeeping
- **Portfolio Tracking** — Live token balances across BANKR and Virtuals ecosystems + stablecoins (USDC, USDT, DAI, EURC)
- **CSV & PDF Export** — Download full transaction history or formatted reports
- **Shareable Reports** — Public-facing report links at `/report/[wallet]`

---

## Key Features

### App (Authenticated)
- **Dashboard** — Financial stats, sparkline charts, AI insight cards, agent search
- **Transactions** — Full ledger with date filtering, category editing, transaction notes, flagging
- **Portfolio** — Live token balances with 24h price changes across ecosystem + stablecoins
- **Reports** — Pre-built views: summary, cashflow, categories, flagged items
- **Wallets** — Multi-wallet support, add/remove wallets
- **Categories** — Custom category management
- **Developer** — API key management, $LUCA token-gated rate limits, usage logs, wallet linking

### Landing Page (`/`)
- How it works, features, $LUCA utilities, $LUCA token card, x402 API section
- Luca section — meet the AI accountant agent
- FAQ, CTA

### Luca Page (`/luca`)
- Standalone marketing page for [Luca](https://t.me/AskLucaBot) — the AI accountant agent
- Capabilities, how it works, sample report, For Agents / For Builders use cases
- Content series, $LUCA token card with live price and copy contract address
- SEO metadata (OG + Twitter card)

### Agent Financial Registry (`/registry`)
- Public directory of 20+ AI agents indexed by Luca
- Confidence labels, wallet data, ecosystem filters, Luca's research notes
- Agent verification CTA powered by $LUCA

---

## API

Public REST API with key-based auth and $LUCA token-gated rate limits.

| Tier | Requirement | Requests/day |
|------|-------------|-------------|
| Free | Any API key | 100 |
| LUCA Holder | ≥ 1,000 $LUCA | 500 |
| LUCA Whale | ≥ 10,000 $LUCA | 2,000 |

**Base URL:** `https://x402books.xyz/api/v1`

**Auth:** `X-API-Key: xb_live_...` header

### Endpoints

```
GET  /api/v1/agent-financial-state?wallet=0x...   Agent financial state summary
GET  /api/v1/full-report?wallet=0x...             Full audit report
GET  /api/v1/transactions?wallet=0x...            Paginated transaction list
GET  /api/v1/ledger-summary?wallet=0x...          Ledger totals
GET  /api/v1/categorize?wallet=0x...              Category breakdown
```

Get your API key at [x402books.xyz/developer](https://x402books.xyz/developer).

---

## Luca — AI Accountant Agent

**Luca** is the official x402Books AI agent, powered by $LUCA. He lives on Telegram and answers financial questions about any Base wallet.

- Telegram: [@AskLucaBot](https://t.me/AskLucaBot)
- X: [@AskLucaAI](https://x.com/AskLucaAI)
- Page: [x402books.xyz/luca](https://x402books.xyz/luca)

Luca is powered by the x402Books API (LUCA Whale tier). Agent runtime: [Hermes](https://hermes.ai) on local Mac with skill file at `~/.hermes/skills/finance/x402books/SKILL.md`.

---

## Token

| Token | Contract | Network | Purpose |
|-------|----------|---------|---------|
| $LUCA | `0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3` | Base | Unified ecosystem token — API tiers, premium features, agent intelligence credits |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth | Privy |
| Database | Supabase (PostgreSQL) |
| Styling | Custom CSS design system (dark/light mode) |
| Blockchain | Base — Alchemy API, BANKR API, Virtuals Protocol API, Dune Analytics |
| AI | Claude (Anthropic) — categorization, summaries, insights |
| Payments | x402 protocol — HTTP 402, USDC on Base, BANKR x402 Cloud |
| Analytics | Vercel Analytics |
| Deploy | Vercel |

---

## Environment Variables

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
X402BOOKS_INTERNAL_SECRET=your_internal_secret   # shared secret for BANKR x402 Cloud proxy auth

# $LUCA token — ecosystem token on Base
LUCA_TOKEN_ADDRESS=0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3

# Dune Analytics (BANKR ecosystem token registry)
DUNE_API_KEY=your_dune_key
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel Project Settings
4. Deploy

---

## Supabase Schema

Key tables:

- `users` — Privy user records (privy_id, email, x_handle, last_seen_at)
- `api_keys` — API key records with tier, usage counters, wallet linking
- `api_usage` — per-request usage logs
- `agent_submissions` — registry verification requests
- RPC `increment_api_key_usage` — atomic daily counter increment

---

## Security

- API keys stored as SHA-256 hashes — raw keys are never persisted
- Service role key is server-side only (never exposed to client)
- Rotate any exposed Supabase keys immediately in Supabase Dashboard
