# Zetta API for Bankr Agent Teams

How a Bankr agent team reads its own financial data from Zetta, what each
number means (actual vs. estimated vs. missing), and what an agent-scoped key
can and cannot do.

> Canonical hosted docs live at the GitBook (see `DOCS_URL`); this file is the
> source-of-truth spec for the Bankr-facing v1 endpoints and should be synced
> there.

---

## Authentication

Pass your key either way:

```
Authorization: Bearer <key>
X-API-Key: <key>
```

### Agent-scoped keys — `agent:{slug}`

Keys named `agent:<your-agent-slug>` (e.g. `agent:bankr-bot`) are **scoped**:
they can read that agent's data and nothing else. Scope is enforced centrally
in the API layer and covered by tests (`src/__tests__/agent-scope.test.ts`) —
a scoped key requesting another agent's data always receives:

```
403 { "error": "This API key is scoped to agent 'bankr-bot', not 'other-agent'. Use a key scoped to this agent, or an unscoped key." }
```

Scoped-key rules:
- **Read**: `agent-books`, `agent-books/history`, `agent-revenue`,
  `agent-truth`, `agent-report`, `agent-events` — own slug only.
- **Write**: `POST /api/v1/agent-events` — a scoped key can only log events
  under its own agent, never another's.
- Wallet-level endpoints (`ledger-summary`, `full-report`, `scan`,
  `transactions`) query public on-chain data by wallet address and are not
  agent-scoped — they never return Zetta's derived agent books.

Request a scoped key at `/developer` or via the Zetta team.

---

## Endpoints

### `GET /api/v1/agent-books/{slug}?range=30d`
The core product output: revenue, expenses, net income, and treasury across
the agent's **declared** wallets, internal transfers eliminated.
`range`: `7d | 14d | 30d | 90d` (default `30d`).

### `GET /api/v1/agent-books/{slug}/history`
Snapshots of past books periods (trend data).

### `GET /api/v1/agent-revenue/{slug}?chain=&classification=&since=`
Classified revenue events (settlement detection, per-transaction).

### `GET /api/v1/agent-truth/{slug}`
Observed-truth summary: classification counts, revenue candidates,
unresolved inflows — the raw evidence layer underneath books.

### `GET /api/v1/agent-report?agentName={name}&days=7`
Plain-language financial report generated from the event log.

### Not available (yet)
`/api/v1/agent-wallets/{slug}` and `/api/v1/agent-holdings/{slug}` **do not
exist**. Declared wallets and their roles appear inside the `agent-books`
response (`wallets`) and on the public profile; stablecoin treasury balance
appears as `financials.treasury_balance_usd`.

---

## Reading the numbers: actual · estimated · missing · unavailable

Zetta never fabricates a number. Every field falls into one of four classes:

| Class | What it means | How it appears |
|---|---|---|
| **Actual** | Computed from on-chain transactions of manifest-declared, books-eligible wallets. | `financials.revenue_usd`, `expenses_usd`, `net_income_usd`, `tx_count`, `classification.settlement_revenue_usd` (highest-confidence tier: stablecoin inflows from known counterparties). |
| **Estimated / lower-confidence** | Real observations whose classification is not certain. Check `confidence.*` (`high/medium/low`) per metric. | `classification.agent_token_revenue_usd` (agent-token inflows — **never counted as operating revenue**), `fee_received`-tier events in `agent-truth`, anything the response flags in `confidence.flags`. |
| **Missing** | Not tracked or not fetchable right now — reported as `null`, **never as `$0`**. | `treasury_balance_usd: null` (no treasury wallet, or the balance lookup failed), `runway_months: null` (needs treasury), gas costs (not tracked at all). |
| **Unavailable** | The agent has no attributed books. You get an honest `200` with `attributed: false` and a `reason` — not an empty ledger. | `{ "attributed": false, "reason": "no_manifest_wallets" \| "wallets_declared_not_scannable" \| "financials_under_review" }` |

Also relevant:
- `classification.quarantined_inflows_usd` — inflows deliberately **held out**
  of revenue (suspected capital injections, grants, bridge receipts) pending
  classification. Quarantined ≠ revenue.
- `generated_at` — books freshness; the cache refreshes on a ~4h cycle.
- `agent-truth` classifications marked `unknown` stay unknown — ambiguous
  activity is never auto-upgraded to revenue.

---

## Errors

| Status | Meaning | Example |
|---|---|---|
| 400 | Bad parameter — message names the field and valid values | `"Range must be 7d, 14d, 30d, or 90d."` |
| 401 | No/invalid key | `"Missing API key. Pass it as Authorization: Bearer <key> or X-API-Key header."` |
| 403 | Scoped key requesting another agent | `"This API key is scoped to agent 'bankr-bot', not 'luca'. …"` |
| 404 | Unknown agent slug | `"Agent 'foo' not found in the registry. Browse agents at /registry."` |
| 503 | Registry/backing store unavailable | `"Registry unavailable"` |

Rate limits apply per key; usage is recorded per endpoint.

---

## Quick start (Bankr team, own data)

```bash
KEY="<your agent:bankr-bot key>"
curl -s -H "Authorization: Bearer $KEY" \
  https://www.zettaai.co/api/v1/agent-books/bankr-bot?range=30d | jq '.financials'

# Proof of isolation — any other slug returns 403:
curl -s -H "Authorization: Bearer $KEY" \
  https://www.zettaai.co/api/v1/agent-books/luca | jq '.error'
```
