# index-observed-truth

**Luca Skills by Zetta** — Callable financial intelligence for the agent economy.

## What it does

Indexes on-chain transactions for all books-eligible wallets in the registry and classifies each one conservatively. Upgrades wallet evidence status when strong signals are present. Safe to re-run — all inserts are idempotent.

This is a **scheduled admin skill**, not a public endpoint. It is called by Hermes on a weekly schedule and can be triggered manually at any time.

## Endpoint

```
GET https://www.zettaai.co/api/cron/index-observed-truth
```

## Auth

```
Authorization: Bearer <ZETTA_INTERNAL_SECRET>
```

or

```
x-internal-secret: <ZETTA_INTERNAL_SECRET>
```

This is an internal secret shared between Hermes and Zetta. It is **not** a public API key. Never log it or include it in responses.

## Input

No request body. The endpoint uses hardcoded conservative defaults:
- `limit`: 200 transactions per wallet
- `max_wallets`: 50 wallets per run (prevents Vercel function timeout)

To index a single wallet with custom parameters, use the admin endpoint:
```
POST https://www.zettaai.co/api/admin/truth-engine/index-wallet
```

## Output

```json
{
  "ok": true,
  "wallets_eligible": 24,
  "wallets_indexed": 24,
  "wallets_skipped": 0,
  "events_classified": 1840,
  "evidence_upgrades": 3,
  "insert_errors": 0,
  "truncated": false,
  "duration_ms": 34210,
  "timestamp": "2026-06-25T02:00:12.000Z"
}
```

### Classification buckets

| Bucket | Meaning | Confidence |
|--------|---------|-----------|
| `settlement_revenue` | Inbound from a known registry wallet | High |
| `fee_received` | Inbound stablecoin from unknown source — possible service fee | Medium |
| `inference_spend` | Outbound to inference/service contract or registry wallet | High/Medium |
| `treasury_movement` | Transfer between this agent's own declared wallets | High |
| `token_distribution` | Outbound non-stablecoin ERC-20 — not revenue | Medium |
| `external_expense` | Outbound to unknown/unregistered address | Low |
| `unknown` | No reliable classification signal | Low |

### Evidence upgrade thresholds

| Status | Trigger |
|--------|---------|
| `observed` | Any meaningful classified event (not `unknown` or `token_distribution` only) |
| `verified` | `settlement_revenue` from a registry wallet **or** ≥3 distinct `fee_received` counterparties |

Status only upgrades, never downgrades.

## Integrity rules

- Unknown beats overclaim — ambiguous inbound never auto-classifies as revenue
- `settlement_revenue` only fires when the sender address is declared in another agent's manifest
- `fee_received` is stablecoin inflow at medium confidence — not treated as confirmed revenue publicly
- Evidence status reads current rank before writing; no downgrades ever written
- All event inserts are idempotent on `(agent_slug, tx_hash, classification)` — re-running never creates duplicates

## Example

```bash
curl -s -X GET https://www.zettaai.co/api/cron/index-observed-truth \
  -H "Authorization: Bearer ${ZETTA_INTERNAL_SECRET}"
```

## Hermes schedule

```
# Every Sunday at 02:00 UTC — well clear of the daily-report run at 09:00
0 2 * * 0  index-observed-truth
```

After each run, Hermes should log the result back to Zetta:

```bash
POST https://www.zettaai.co/api/admin/subagent-runs
Authorization: Bearer <ZETTA_INTERNAL_SECRET>

{
  "subagent_name": "index-observed-truth",
  "status": "success",
  "started_at": "<ISO timestamp>",
  "finished_at": "<ISO timestamp>",
  "duration_ms": 34210,
  "summary": "Indexed 24 wallets. 1840 events classified. 3 evidence upgrades.",
  "triggered_by": "hermes"
}
```

## Usage notes

- A Telegram notification is sent to `LUCA_ADMIN_CHAT_ID` after every run regardless of outcome
- If `wallets_eligible` is 0, no manifests have been ingested yet — run the manifest ingest step first
- If `truncated: true`, there are more wallets than the 50-wallet cap — either increase `max_wallets` on the admin endpoint or run it in batches manually
- Provider fallback is automatic: Alchemy → Etherscan/Basescan → skip if both unavailable

## Limitations

- Processes up to 50 wallets per run to stay within Vercel function timeout limits
- Does not assign USD revenue totals for `fee_received` — that bucket is medium confidence only
- `settlement_revenue` is only high confidence once the counterparty is in the registry; wallets not yet ingested classify as `unknown`
- Provider keys required: `ALCHEMY_API_KEY` (preferred) or `BASESCAN_API_KEY` / `ETHERSCAN_API_KEY` (fallback)
