# x402Books

**Financial intelligence for the agent economy.**

x402Books is the financial identity layer for autonomous agents. It indexes declared wallet manifests, classifies on-chain activity into operational finance (revenue, expenses, treasury movement), and publishes readable books — per-agent P&L, treasury health, and economic reports — built on Base.

Live at **[x402books.xyz](https://www.x402books.xyz)**

---

## Architecture

```
x402Books  =  infrastructure  (index, classify, interpret, display)
Luca       =  intelligence    (analyst interface on top of x402Books)
$LUCA      =  ecosystem asset (not the product, not the narrative)
```

x402Books sees: wallet A sent USDC to wallet B.
Luca interprets: "recurring settlement activity detected."

---

## Product

### Registry — `/registry`

Public financial directory for autonomous agents. Each agent profile shows:
- Declared wallet manifest (roles: treasury / fee / deployer / operator)
- Verification status and evidence sources
- Settlement pattern classification (active, stable, dormant, etc.)
- Ecosystem (BANKR, Virtuals, AEON, EigenCloud, Base)

### Agent Books — `/registry/[slug]`

Per-agent financial statements generated from on-chain data:
- **Revenue** — external inflows to declared wallets
- **Expenses** — categorized outflows (inference, fees, operations, gas)
- **Net income** — revenue minus expenses, 30-day rolling
- **Treasury balance** — live USDC + USDT stablecoin balance on Base
- **Runway** — treasury balance ÷ 30-day burn rate
- Internal transfers between an agent's own wallets are excluded — treasury movement is not revenue

Attribution is the prerequisite. No declared wallets → no books.

### Economic Leaderboard — `/leaderboard`

All attributed agents ranked by 30-day revenue. Includes Agent GDP aggregate (total revenue, expenses, net income across all attributed agents).

### Research — `/research`

"State of the Agent Economy" reports written by Luca. Two-phase generation:
1. **Grok** — real-time research on X and the web for live agent context
2. **Claude** — Bloomberg-style report prose using x402Books financial data + Grok findings

Reports are published via the admin generate endpoint and live permanently at `/research/[slug]`.

### Luca — `/luca`

Financial analyst interface. Luca reads the books, writes the reports, and runs on Hermes (OpenAI). He is not a chatbot — he is the intelligence layer on top of x402Books data.

---

## API

Public REST API with key-based auth and $LUCA token-gated rate limits.

**Base URL:** `https://www.x402books.xyz/api/v1`

**Auth:** `X-API-Key: xb_live_...` header

| Tier | Requirement | Requests/day |
|------|-------------|--------------|
| Free | Any key | 100 |
| LUCA Holder | ≥ 1,000 $LUCA | 500 |
| LUCA Whale | ≥ 10,000 $LUCA | 2,000 |

```
GET  /api/v1/agent-financial-state   Agent financial state summary
GET  /api/v1/full-report             Full audit report for a wallet
GET  /api/v1/transactions            Paginated transaction list
GET  /api/v1/ledger-summary          Ledger totals
GET  /api/v1/categorize              Category breakdown
```

Get an API key at [x402books.xyz/developer](https://www.x402books.xyz/developer).

---

## Token

| Token | Contract | Network |
|-------|----------|---------|
| $LUCA | `0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3` | Base |

$LUCA gates API rate limits. It is the ecosystem asset — not the product, not the narrative.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, ISR) |
| Database | Supabase (PostgreSQL) |
| Blockchain | Base — Alchemy API |
| AI — Reports | Claude (Anthropic) — report writing |
| AI — Research | Grok API — real-time X/web research |
| AI — Luca | OpenAI on Hermes |
| Styling | Custom CSS design system (dark/light mode) |
| Auth | Privy |

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=

# Blockchain
ALCHEMY_API_KEY=               # treasury balance + token data (server-side)
NEXT_PUBLIC_ALCHEMY_API_KEY=   # client-side wallet scanning

# AI
ANTHROPIC_API_KEY=             # report writing (Claude)
GROK_API_KEY=                  # optional — research phase (Grok); reports generate without it

# Internal
X402BOOKS_INTERNAL_SECRET=     # bearer token for /api/admin/* routes — fail-closed when unset

# $LUCA
LUCA_TOKEN_ADDRESS=0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3

# Optional
BANKR_X402_API_KEY=
DUNE_API_KEY=
```

---

## Supabase Migrations

Run in order from the Supabase SQL editor (`supabase/` directory). All files are idempotent.

| File | Purpose |
|------|---------|
| `registry-schema.sql` | Agent registry tables |
| `stage-1-ledger.sql` | Ledger and transaction tables |
| `inference-events.sql` | Inference spend tracking |
| `tool-decision-events-v2.sql` | Tool decision log |
| `agent-economic-events.sql` | Economic event log |
| `research-reports.sql` | Published research reports |
| `agent-gdp-history.sql` | GDP snapshots for trend tracking |
| `api-keys-ownership.sql` | API key wallet ownership |

---

## Admin Endpoints

All admin routes require `Authorization: Bearer <X402BOOKS_INTERNAL_SECRET>`.

### Generate a research report

```bash
POST /api/admin/research/generate
{
  "type": "weekly",                         # weekly | monthly | quarterly
  "title": "State of the Agent Economy #1", # optional — overrides auto-generated title
  "subtitle": "...",                        # optional
  "force": false                            # set true to overwrite a same-day report
}
```

Luca calls this from Hermes on his own schedule. No Vercel Cron required.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Security

- `X402BOOKS_INTERNAL_SECRET` must be set in production — routes fail closed when missing
- API keys stored as SHA-256 hashes — raw keys are never persisted
- Timing-safe comparisons on all token/secret checks
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never exposed to client
- Never commit `.env` files
