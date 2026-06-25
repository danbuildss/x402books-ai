# Zetta AI — Product-First MVP Plan

## Product Positioning
- **Positioning:** Financial visibility for AI agents.
- **One-liner:** Zetta AI turns raw USDC microtransactions into clean books, reports, and budget insights for AI agents and builders.
- **Core promise:** Paste a wallet. Get readable x402 books.

## MVP Scope
Users can:
1. Paste/connect a Base wallet.
2. Fetch USDC transfers.
3. Detect likely x402-style payments.
4. Categorize income/expenses with rules + AI.
5. Generate a dashboard summary, CSV export, monthly report, and agent-readable JSON.

## Architecture (MVP)
- **Frontend:** Next.js + Tailwind + shadcn/ui + Recharts.
- **Backend:** Next.js API routes.
- **Data Source:** Alchemy or Covalent for historical ERC-20 transfer fetch.
- **Database:** Supabase.
- **AI:** OpenAI or Claude for fallback categorization (rules-first pipeline).

## Core Pages
1. **Landing page**
   - Hero: “Readable books for the agent economy”.
   - How it works, use cases, sample report, CTA.
2. **Wallet dashboard**
   - Total spend, total income, transaction count, likely x402 count.
   - Top counterparties, categories, risk flags, export CSV.
3. **Report page**
   - Monthly snapshot with spend/income/net + categories.
4. **Agent API**
   - `GET /api/ledger/summary?wallet=0x...`
   - `GET /api/ledger/transactions?wallet=0x...`
   - `GET /api/ledger/report?wallet=0x...&period=30d`

## Supabase Tables
- `wallets`
- `transactions`
- `categories`
- `reports`
- `api_keys`
- `known_services`

### transactions schema (MVP)
- `id`
- `wallet_address`
- `tx_hash`
- `timestamp`
- `direction`
- `counterparty`
- `amount_usdc`
- `category`
- `confidence_score`
- `memo`
- `is_likely_x402`
- `risk_flag`
- `created_at`

## Detection & Categorization Strategy
### likely x402 heuristic (label only as “likely”)
A transfer is flagged as likely x402 when:
- token is USDC on Base,
- amount is in micro-payment range,
- counterparty repeats,
- amounts repeat in pay-per-request patterns,
- frequency is high over short windows.

> Important: never claim protocol certainty unless protocol metadata or known service registry confirms it.

### Categorization pipeline
1. **Rules first:** deterministic labels for known patterns.
2. **AI second:** label unresolved rows via strict JSON response.
3. **Human override later:** admin correction path.

## 72-Hour Execution Plan
### Friday (Setup)
- Initialize Next.js app.
- Install Tailwind + shadcn/ui.
- Create Supabase project and env wiring.
- Ship landing page and wallet input form.

**Goal:** User can paste wallet address.

### Saturday (Core Engine)
- Fetch Base USDC transfers from provider API.
- Normalize + persist transactions in Supabase.
- Add dashboard table and summary cards.
- Implement likely x402 heuristic + initial rules categories.

**Goal:** Paste wallet → clean transaction table.

### Sunday (AI + Reporting)
- Add AI categorization fallback endpoint.
- Add CSV export.
- Build report page and summary endpoint.
- Return agent-readable JSON for summary/report.

**Goal:** Paste wallet → categorized report + exports.

## Feature Priority
1. Wallet scan
2. USDC transaction table
3. Summary cards
4. AI categorization
5. CSV export
6. Agent API
7. PDF report
8. Alerts
9. Token utility

## Non-Goals (MVP)
- Token staking
- Governance
- Complex tax compliance
- Multi-chain support
- Full PDF design system
- Mobile app
- Enterprise dashboard

## API Contracts (Draft)
### `GET /api/ledger/summary`
Response:
```json
{
  "wallet": "0x...",
  "period": "30d",
  "total_spend_usdc": 42.8,
  "total_income_usdc": 91.2,
  "net_usdc": 48.4,
  "tx_count": 120,
  "likely_x402_count": 84,
  "top_categories": [
    {"category": "api_call", "amount_usdc": 20.4},
    {"category": "data_access", "amount_usdc": 11.1}
  ]
}
```

### `GET /api/ledger/transactions`
Response:
```json
{
  "wallet": "0x...",
  "items": [
    {
      "tx_hash": "0x...",
      "timestamp": "2026-04-14T12:13:00Z",
      "direction": "expense",
      "counterparty": "0x...",
      "amount_usdc": 0.15,
      "category": "api_call",
      "is_likely_x402": true,
      "risk_flag": "none"
    }
  ]
}
```

### `GET /api/ledger/report`
Response:
```json
{
  "wallet": "0x...",
  "period": "30d",
  "headline": "April 2026 Agent Spend Report",
  "summary": {
    "total_spend_usdc": 42.8,
    "total_income_usdc": 91.2,
    "net_usdc": 48.4
  },
  "main_categories": ["api_call", "data_access", "compute", "agent_service"]
}
```

## Next Build Step
Start implementation with **Day 1 setup** and a thin vertical slice:
- Wallet form -> API call -> one mocked summary card -> persisted scan request.
