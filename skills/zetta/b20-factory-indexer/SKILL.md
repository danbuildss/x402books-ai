# b20-factory-indexer

**Luca Skills by Zetta** — Future skill. Not active. Documentation only.

## Status

**Not built yet.** This skill is planned for when the B20 ecosystem has enough active tokens
to justify automatic discovery. Until then, B20 tokens are sourced manually and indexed
only after `isB20Token: true` is set in `src/app/registry/data.ts`.

## What it will do

Index `CreateB20Token` events from the B20 factory contract on Base to automatically
discover newly launched B20 tokens. Each discovered token is added to a candidate pool
for manual admin review — **not indexed automatically**.

## Factory contract

```
0xB20f000000000000000000000000000000000000
```

Chain: Base mainnet only. B20 is a Base-native precompile (Beryl upgrade, June 2026).

## Event signature

```
CreateB20Token(address indexed token, address indexed issuer, string name, string symbol)
```

Fetch via Alchemy `eth_getLogs` or `alchemy_getAssetTransfers` from the factory address.

## Planned output

```json
{
  "ok": true,
  "factory": "0xB20f000000000000000000000000000000000000",
  "events_scanned": 142,
  "new_candidates": 12,
  "already_known": 130,
  "candidates": [
    {
      "address": "0xB200a1c3d4e5f6...",
      "issuer_wallet": "0xdeployer...",
      "name": "AgentToken",
      "symbol": "AGNT",
      "deployed_block": 28400000,
      "linked_agent": null,
      "recommendation": "Check registry for issuer wallet match, then review manually"
    }
  ],
  "timestamp": "2026-09-01T02:00:00.000Z"
}
```

## What it will NOT do

- **Never** auto-set `isB20Token: true` — that remains a manual admin step always
- **Never** insert token contracts into `agent_wallet_claims` or books-eligible wallets
- **Never** classify factory events as revenue or include them in Agent GDP
- **Never** auto-attribute issuer wallets to agents without manifest confirmation

## Planned trigger

Once built, this runs on a weekly schedule alongside `index-observed-truth`:

```
# Every Sunday at 03:00 UTC — after observed truth at 02:00
0 3 * * 0  b20-factory-indexer
```

Hermes logs the run result back to `/api/admin/subagent-runs`:

```bash
POST https://www.zettaai.co/api/admin/subagent-runs
Authorization: Bearer <ZETTA_INTERNAL_SECRET>

{
  "subagent_name": "b20-factory-indexer",
  "status": "success",
  "started_at": "<ISO timestamp>",
  "finished_at": "<ISO timestamp>",
  "duration_ms": 4200,
  "summary": "Scanned 142 factory events. 12 new candidates queued for manual review.",
  "triggered_by": "hermes"
}
```

## Data integrity rules (unchanged from current B20 pipeline)

- B20 token contracts are never books-eligible
- B20 token transfers are not operating revenue
- Issuer/deployer wallet is not automatically attributed
- B20 activity is excluded from Agent GDP unless classified through
  manifest-declared revenue/payment wallets
- `isB20Token: true` must always be set manually after human review

## Build prerequisites

Before building this skill:

1. B20 ecosystem must have meaningful token volume (>20 active tokens)
2. Alchemy must support `eth_getLogs` for the factory on Base mainnet
3. The manual sourcing flow must be proven and stable
4. Admin review UI for the candidate pool must be designed

## When to build

When the manual sourcing flow becomes the bottleneck — i.e. when new B20 tokens
are being missed because there are too many to track manually. Until then,
manual sourcing is safer and more conservative.
