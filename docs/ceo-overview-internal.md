# Zetta — Internal CEO Overview
**Confidential · June 28, 2026**

---

## What We Are Building

Zetta is building **financial intelligence for the agent economy** — the infrastructure layer that makes autonomous agents financially readable, auditable, and credible.

The core loop:

```
Agent declares wallet manifest
    ↓
Zetta attributes wallet activity
    ↓
Agent Books are generated (revenue, expenses, net income, treasury)
    ↓
Luca interprets and publishes the data
    ↓
Agent's financial identity is live and readable
```

Without a declared manifest, there are no books. This is a hard rule, not a policy.

---

## The Three Layers — Kept Distinct

| Layer | What It Is | What It Is Not |
|-------|-----------|----------------|
| **Zetta** | Infrastructure platform: indexes agents, attributes wallets, classifies transactions, produces financial data | An AI agent, a token product, a dashboard |
| **Luca** | AI financial analyst: reads Zetta data, writes reports, answers queries, exposes Skills API | The product itself, a chatbot, a trading tool |
| **$LUCA** | Community and access token: gates API rate limits and tier upgrades | The company, the brand, the product narrative |

These are not interchangeable. In all external communication, Zetta is the infrastructure. Luca is the intelligence. $LUCA is the access layer.

---

## Hard Data Rules (Non-Negotiable)

These rules govern every number Zetta produces:

- **No manifest = no books.** An agent without a declared wallet manifest has no financial books. Period.
- **Discovered wallet ≠ attributed wallet.** Finding a wallet on-chain does not make it books-eligible. The agent must declare it.
- **Token activity ≠ revenue.** ERC-20 token transfers are not operating revenue. Token issuance (mint events from `0x0`) are never revenue.
- **Gross inflow ≠ operating revenue.** Internal transfers, capital injections, and token movements are quarantined before revenue is calculated.
- **ERC-8004 = identity, not financial attribution.** The on-chain identity registry tells us who the agent is, not what it earns. ERC-8004 data does not produce books.
- **B20 = token activity, not revenue by default.** B20 token tracking captures mint/burn/transfer activity and links tokens to agents. Token activity does not become revenue without a stablecoin classification.
- **Token contracts are never books-eligible.** Only EOA wallets and treasury contracts (Gnosis Safe, multi-sig) produce books.

---

## What Is Shipped

### Registry (`/registry`)
A public financial directory of autonomous agents indexed on Base. Every agent with a declared manifest gets a live profile — revenue, expenses, net income, treasury position, confidence label, and a Luca verdict.

- 80+ agents indexed (candidates + verified)
- Verification lifecycle: Candidate → Needs Verification → Verified
- Agent profiles (`/registry/[slug]`) show 30-day books
- Embeddable card widget per agent (`/registry/[slug]/card`) — **needs production verification on rendering**
- Filter and search by ecosystem, status, revenue

### Agent Books
For agents with books-eligible manifests, Zetta computes rolling 30-day financials:
- Operating revenue (external stablecoin inflows from declared wallets)
- Operating expenses (inference spend, provider costs, external services)
- Net income
- Treasury balance (stablecoin holdings across all declared wallets)
- Revenue confidence label (High / Medium / Low / Under Review)

### Agent GDP (`/` homepage)
Aggregate of all attributed agent financials — total revenue, expenses, net income, attributed agent count. Updated on ISR (1-hour cache). Snapshotted to `agent_gdp_history` table for trending.

### Leaderboard (`/leaderboard`)
All attributed agents ranked by 30-day operating revenue. Filterable by ecosystem. Cached with 5-minute revalidation.

### Research System (`/research`, `/research/[slug]`)
"State of the Agent Economy" reports written by Luca. Three cadences: weekly, monthly, quarterly.

**Generation pipeline:**
1. Snapshot current agent books + GDP
2. Grok API phase — real-time X/web context on top agents and ecosystems (requires `GROK_API_KEY`)
3. Claude composition phase — Bloomberg-style prose report (requires `ANTHROPIC_API_KEY`)
4. Published at `/research/[slug]` with OG image preview

**Inaugural report:** Static fallback (`src/lib/inaugural-report.ts`) ships Q2 2026 baseline report without needing DB data. Subsequent reports are admin-triggered via `/api/admin/research/generate`.

### Luca Skills API (`/api/luca/skills/*`)
Seven callable financial intelligence functions, authenticated via the same API key system as V1:

| Skill | What It Returns |
|-------|----------------|
| `wallet-audit` | Address classification — EOA / token contract / treasury contract / books eligibility |
| `agent-books` | Full financial statement (revenue, expenses, net income, confidence) for a given period |
| `treasury-monitor` | Stablecoin balances per declared wallet + health signal (healthy / low / critical) |
| `revenue-analysis` | Gross inflow vs operating revenue breakdown with quarantine rate |
| `registry-check` | Agent lookup by slug, name, or address — attribution tier, wallet eligibility, ERC-8004 status |
| `luca-report` | Composite output — identity + books + treasury + Luca narrative verdict |
| `b20-token-analysis` | B20 identity, issuer, linked agent, mint/burn activity, financial readiness signal |

### Developer API (`/api`)
Public documentation page. Tiered access gated by $LUCA balance.

| Tier | $LUCA Required | Requests/Day |
|------|---------------|--------------|
| Free | 0 | 100 |
| Developer (Holder) | ≥ 1,000 | 500 |
| Enterprise (Whale) | ≥ 10,000 | 2,000 |

Auth: `Authorization: Bearer zt_live_...` — keys managed at `/dashboard/keys`. Raw keys are never stored (SHA256 hash only). Agent-scoped keys supported.

### B20 Token Intelligence (`/b20`, `/b20/[address]`)
Token identity layer for B20-standard tokens. Tracks issuer wallet, owner wallet, deployer, linked agent (via manifest or admin override), and mint/burn/transfer activity history. Token activity does not become revenue by default.

### ERC-8004 Identity Indexing
Indexes agent identities from the on-chain registry (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`). Extracts: name, DID, operator wallet, capabilities, endpoints, payment address. Identity only — not financial attribution.

### Admin Operations Suite (`/luca-admin`)
Comprehensive internal dashboard:

| Page | Purpose |
|------|---------|
| Registry Updates | Pending submissions and verification queue |
| Revenue Accuracy Report | Classification accuracy review |
| Revenue Audit | Detailed audit trail for flagged transactions |
| Revenue Confidence | Manual confidence label override |
| Attribution Health | Coverage gap analysis — who is indexed but missing books |
| Agent Economics | Per-agent economic event summary |
| ERC-8004 Ingestion | Identity registry indexing status |
| B20 Intelligence | Token indexing and activity dashboard |
| Address Classification | Address type classifier interface |

Admin auth is fail-closed: returns 401 if `ZETTA_INTERNAL_SECRET` is unset in production. Full audit logging on every admin action.

### Wallet Manifest System
`.agent/wallets.json` — the wallet declaration format. Full spec, worked examples, migration guide, and a live client-side validator at `/validate`.

### Dashboard & API Keys (`/dashboard/*`)
Privy-authenticated user dashboard. Manages API keys, $LUCA balance verification for tier upgrades, agent registry submissions, and attribution review. `/developer` redirects to `/dashboard/keys`.

### Inference Tracking
Every Luca inference request is logged to `inference_events` — model, cost (estimated), latency, provider. Luca tracks her own spend. Used for agent economic event ledger.

---

## Current State — Honest Labels

| Feature | Status | Notes |
|---------|--------|-------|
| Agent Registry (80+ agents) | **Live** | Candidates + verified agents. Books only where manifest exists. |
| Agent Books (financial statements) | **Live** | Requires declared manifest. Token contracts excluded. |
| Agent GDP aggregate | **Live** | 1-hour ISR cache. Daily snapshot to history table. |
| Leaderboard | **Live** | 5-min cache. Only attributed agents appear. |
| Research reports (Luca-authored) | **Live** | Admin-triggered. Requires `ANTHROPIC_API_KEY` + `GROK_API_KEY` in env. |
| Inaugural Q2 2026 report | **Live** | Static fallback. Live at `/research/state-of-agent-finance-q2-2026`. |
| Luca Skills API (7 skills) | **Live** | Authenticated. Route handlers exist and are deployed. |
| B20 Token Intelligence | **Live** | Token identity + activity. Not revenue by default. |
| ERC-8004 Identity Indexing | **Live** | Admin-triggered ingestion. Identity only. |
| Admin Operations Suite | **Live** | Internal only. Fail-closed auth. |
| Wallet Manifest Validator | **Live** | Client-side. No server round-trip. |
| API Key Management | **Live** | $LUCA-gated tiers. Hash-only storage. |
| Embeddable Agent Card | **Needs production verification** | Route exists. Rendering in external contexts unverified. |
| Telegram Bot (`@AskLucaBot`) | **Needs production verification** | Integration code exists. Uptime and active state not confirmed. |
| x402 Payment Flagging | **Partial** | `is_likely_x402` flag set on transactions. Full inference routing not wired. |
| Agent Submission Review (automated) | **Partial** | Submission form works. Luca review of submissions is manual. |
| Grok Phase (report context) | **Partial** | Optional. Falls back to financial-only report if `GROK_API_KEY` absent. |
| On-chain attestation | **Not yet built** | Smart contract verification of books. |
| Treasury Alerts | **Not yet built** | Real-time notifications for low runway or large movements. |
| Cohort Analytics | **Not yet built** | Ecosystem comparison (BANKR vs Virtuals vs AEON). |
| Vector Search (research) | **Not yet built** | Semantic queries across report corpus. |
| Agent submission auto-review | **Not yet built** | Fully automated Luca review pipeline. |
| Revenue model (charging) | **Not yet active** | Infrastructure exists ($LUCA tiers). No billing wired. |

---

## The Real Bottleneck: Attribution Rate

The product is only as useful as the number of agents with declared manifests. Agents without manifests have no books. Their profiles are empty. They cannot appear in research reports.

**The metric that matters most right now:** How many agents have live financial books?

The flywheel cannot run on candidates. It runs on attributed agents — agents with live books whose teams can look at their profile, see real numbers, and choose to share it.

Until attribution rate is meaningfully above where it is today, the research reports are incomplete, the leaderboard is thin, and the product's signal-to-noise ratio is low.

---

## Next 30-Day Focus

1. **Agent outreach** — Direct outreach to every indexed agent without books. The manifest takes minutes. The barrier is awareness.
2. **Manifest submissions** — Track submission rate as a primary metric. Target: 25+ agents with live books within 30 days.
3. **Embeddable report cards** — Verify agent card rendering in external contexts. Make it easy for agents to share their books from X, Bankr, and their own sites.
4. **Leaderboard distribution** — Publish the leaderboard actively. Tag agents. Make being on it mean something.
5. **State of Agent Finance report** — Publish the first data-driven weekly report (not the static inaugural). This is the content that drives sharing and FOMO.
6. **Partner conversations** — Bankr, Virtuals, OpenServ, Base ecosystem. These are the distribution channels. A Bankr integration gets 60+ agents onboarded in one conversation.

---

## The Bottom Line

The infrastructure is mostly in place. The next phase is distribution, validation, and monetization.

---
*Internal use only. Not for distribution.*
