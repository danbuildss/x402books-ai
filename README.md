# Zetta AI

**The financial operating system for autonomous agents.**

Zetta indexes declared wallet manifests, classifies on-chain activity into operational finance (revenue, expenses, treasury movement), and publishes readable books — per-agent P&L, treasury health, and economic reports — built on Base.

Live at **[zettaai.co](https://www.zettaai.co)**

---

## Architecture

```
Zetta   =  infrastructure  (index, classify, interpret, display)
Luca    =  intelligence    (analyst interface on top of Zetta data)
$LUCA   =  ecosystem asset (not the product, not the narrative)
```

Zetta sees: wallet A sent USDC to wallet B.  
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
- **Expenses** — categorised outflows (inference, fees, operations, gas)
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
2. **Claude** — Bloomberg-style report prose using Zetta financial data + Grok findings

Reports are published via the admin generate endpoint and live permanently at `/research/[slug]`.

### Luca — `/luca`

Financial analyst interface. Luca reads the books, writes the reports, and runs on Hermes (OpenAI). He is not a chatbot — he is the intelligence layer on top of Zetta data.

### Luca Skills — `/api/luca/skills`

Callable financial intelligence for autonomous agents, builders, and operators. Seven skills accessible via API key:

| Skill | Description |
|-------|-------------|
| `wallet-audit` | Classify an address and determine books-eligibility |
| `agent-books` | Full financial statement for a registered agent |
| `treasury-monitor` | Stablecoin balances and treasury health signals |
| `revenue-analysis` | Gross inflow vs operating revenue breakdown |
| `registry-check` | Look up an agent by slug, name, or wallet address |
| `luca-report` | Full composite report — identity + books + treasury + narrative |
| `b20-token-analysis` | B20 token identity, issuer, activity, and financial readiness |

Skill discovery: `GET /api/luca/skills`

### B20 Intelligence — `/b20`

Token identity and activity layer for B20 assets on Base:
- Token identity (issuer wallet, owner wallet, deployment block)
- Agent linking (registry match, manifest attribution, candidate detection)
- Mint / burn activity tracking
- Luca token read — narrative summary with data integrity constraints
- Financial readiness signal (books-eligible: always false for token contracts)

**Data integrity:** Token contracts are never books-eligible. Token transfers are not operating revenue. B20 activity is excluded from Agent GDP.

---

## Data Integrity Rules

Every skill and report enforces these rules without exception:

| Rule | Enforcement |
|------|-------------|
| ERC-8004 = identity only | Never used for financial attribution |
| B20 = token identity/activity only | Excluded from Agent GDP |
| `.agent/wallets.json` = attribution source | Only manifest-declared wallets produce books |
| Books-eligible types | `eoa` and `treasury_contract` only |
| Smart/token/proxy contracts | Not books-eligible, ever |
| Discovered wallets | Not books-eligible without manifest |
| Gross inflows ≠ revenue | `gross_inflow_usd` is always distinct from `operating_revenue_usd` |

---

## API

Public REST API with key-based auth and $LUCA token-gated rate limits.

**Base URL:** `https://www.zettaai.co/api/v1`

**Auth:** `Authorization: Bearer zt_live_...` or `X-API-Key: zt_live_...`

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

POST /api/luca/skills/wallet-audit         Classify a wallet address
POST /api/luca/skills/agent-books          Agent financial statement
POST /api/luca/skills/treasury-monitor     Treasury health check
POST /api/luca/skills/revenue-analysis     Revenue vs inflow breakdown
POST /api/luca/skills/registry-check       Agent lookup
POST /api/luca/skills/luca-report          Full composite report
POST /api/luca/skills/b20-token-analysis   B20 token intelligence
```

Get an API key at [zettaai.co/developer](https://www.zettaai.co/developer).

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
ZETTA_INTERNAL_SECRET=     # bearer token for /api/admin/* routes — fail-closed when unset

# $LUCA
LUCA_TOKEN_ADDRESS=0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3

# Optional
BANKR_X402_API_KEY=
DUNE_API_KEY=
```

---

## Supabase Migrations

Run in order from the Supabase SQL editor. All files are idempotent (`IF NOT EXISTS` throughout).

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
| `migrations/2026-06-23_b20-tables.sql` | B20 token intelligence tables |

---

## Admin Endpoints

All admin routes require `Authorization: Bearer <ZETTA_INTERNAL_SECRET>`.

### Generate a research report

```bash
POST /api/admin/research/generate
{
  "type": "weekly",                         # weekly | monthly | quarterly
  "title": "State of the Agent Economy #1", # optional
  "subtitle": "...",                        # optional
  "force": false                            # set true to overwrite a same-day report
}
```

### Index B20 tokens

```bash
POST /api/admin/index-b20
{
  "mode": "from_registry",   # from_registry | single | activity_only
  "dryRun": true,            # preview without DB writes
  "includeActivity": false   # fetch mint/burn events (slower)
}
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Security

- `ZETTA_INTERNAL_SECRET` must be set in production — routes fail closed when missing
- API keys stored as SHA-256 hashes — raw keys are never persisted
- Timing-safe comparisons on all token/secret checks
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never exposed to client
- Never commit `.env` files

---

## Links

- Website: [zettaai.co](https://www.zettaai.co)
- Zetta on X: [@zettaaidotco](https://x.com/zettaaidotco)
- Luca on X: [@asklucaai](https://x.com/asklucaai)
- Telegram: [t.me/asklucaai](https://t.me/asklucaai)
- Contact: [contact@zettaai.co](mailto:contact@zettaai.co)
