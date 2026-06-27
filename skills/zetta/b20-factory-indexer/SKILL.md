# b20-factory-indexer

**Luca Skills by Zetta** — Future skill. Not active. Documentation only.

## Status

**Not built yet.** B20 mainnet activation may be delayed — this is expected and normal.
The Base Sepolia testnet demo (`chain=base-sepolia`) proves the full pipeline (detect → index → Luca read)
while mainnet waits for real activated B20 tokens.

Do not force mainnet indexing if:
- The Activation Registry reports no enabled B20 tokens
- `isB20Initialized(addr)` returns false for all candidates
- No tokens with the `0xB200…` prefix appear on Base mainnet yet

Manual sourcing (`isB20Token: true` in `data.ts`) and the existing admin indexer are sufficient until
the ecosystem has meaningful token volume.

---

## Confirmed contract addresses

| Contract | Address | Chain | Purpose |
|---|---|---|---|
| B20 Factory | `0xB20f000000000000000000000000000000000000` | Base mainnet + Base Sepolia | Deploys B20 tokens; exposes `isB20`, `isB20Initialized`, `getB20Address` |
| Activation Registry | `0x8453000000000000000000000000000000000001` | Base mainnet | Controls whether B20 is active for a given network/address |
| Policy Registry | `0x8453000000000000000000000000000000000002` | Base mainnet | Governs B20 token policies — transfer rules, burn conditions, etc. |

**Critical:** These addresses are infrastructure precompiles. They must never be indexed as B20 tokens.
The `B20_INFRASTRUCTURE_ADDRESSES` guard in `b20-client.ts` enforces this at runtime.
Only `0xB200…` addresses confirmed via `isB20()` + `isB20Initialized()` are indexable.

The factory is a Base-native precompile introduced in the Beryl upgrade (June 2026).
The Activation Registry controls whether B20 is enabled for a given address/variant.

---

## Detection flow (5 steps, all required before indexing)

When this skill is built, a candidate address must pass all five steps before entering the
B20 candidate pool. **No automatic indexing. Human review required at step 5.**

```
1. Prefix check
   address.toLowerCase().startsWith("0xb200")
   → Rejects non-B20 contracts immediately.

2. Factory check — isB20(address)
   eth_call to 0xB20f000000000000000000000000000000000000
   function isB20(address addr) external view returns (bool)
   → Confirms the address was deployed by the B20 factory.
   → A 0xB200 prefix without factory confirmation is not sufficient.

3. Initialization check — isB20Initialized(address)
   eth_call to 0xB20f000000000000000000000000000000000000
   function isB20Initialized(address addr) external view returns (bool)
   → Confirms the token has been initialized (not just deployed as a shell).
   → Skip uninitiated tokens — they are not ready for indexing.

4. Metadata check — name / symbol / totalSupply
   Alchemy alchemy_getContractMetadata or eth_call fallbacks.
   → Null metadata is acceptable for testnet fixtures but unusual for production tokens.
   → Log as candidate regardless; human reviewer decides.

5. Manual review — set isB20Token: true
   Admin reviews the candidate.
   Verifies on Basescan / sepolia.basescan.org.
   Sets isB20Token: true in src/app/registry/data.ts.
   Runs from_registry mode dry run, then live.
   → This step is ALWAYS manual. The skill never writes isB20Token.
```

---

## Activation Registry check (before assuming mainnet B20 is live)

Before running any mainnet discovery, query the Activation Registry to confirm B20 is enabled:

```
Address: 0x8453000000000000000000000000000000000001
```

If the registry reports no active B20 tokens or the network has not yet activated B20:
- Do not run `from_registry` indexing
- Return a clear status: `b20_mainnet_active: false`
- Log the result; do not treat silence as readiness

This guards against running the indexer on a network that hasn't activated B20 yet.

---

## Factory helpers

The B20 factory exposes three helper functions for safe on-chain detection:

### `isB20(address addr) → bool`
Returns `true` if the address was deployed by the B20 factory.
Use before any other indexing step.

```typescript
// eth_call to factory:
// selector: keccak256("isB20(address)")[0:4]
// input:    abi.encode(candidateAddress)
// returns:  bool — true = confirmed B20 factory deployment
```

### `isB20Initialized(address addr) → bool`
Returns `true` if the token has been fully initialized (past deployment shell stage).
A token can be factory-deployed but not yet initialized — skip these.

```typescript
// eth_call to factory:
// selector: keccak256("isB20Initialized(address)")[0:4]
// input:    abi.encode(candidateAddress)
// returns:  bool — true = initialized and ready for indexing
```

### `getB20Address(uint8 variant, address deployer, bytes32 salt) → address`
Deterministically computes the expected B20 token address.
Useful for verifying that a candidate address is the legitimate deployment of a
known (variant, deployer, salt) combination — not for discovery.

```typescript
// eth_call to factory:
// selector: keccak256("getB20Address(uint8,address,bytes32)")[0:4]
// input:    abi.encode(variant, deployer, salt)
// returns:  address — the expected token address
```

**Note:** Function selectors must be verified against the deployed precompile ABI before
implementing. The signatures above are based on the documented interface — confirm
against on-chain bytecode before hardcoding.

---

## Factory event scanning

As an alternative to polling individual candidates, the skill scans factory events:

```
Event: CreateB20Token(address indexed token, address indexed issuer, string name, string symbol)
Method: eth_getLogs from 0xB20f000000000000000000000000000000000000
```

This is implemented in `fetchB20FactoryLogs()` in `src/lib/b20-client.ts`.
On testnet, `logs_scanned: 0` is expected — the factory has not yet emitted events on Sepolia.

---

## Planned output (when built)

```json
{
  "ok": true,
  "b20_mainnet_active": true,
  "factory": "0xB20f000000000000000000000000000000000000",
  "activation_registry": "0x8453000000000000000000000000000000000001",
  "events_scanned": 142,
  "new_candidates": 12,
  "already_known": 130,
  "candidates": [
    {
      "address": "0xB200a1c3d4e5f6...",
      "factory_confirmed": true,
      "initialized": true,
      "issuer_wallet": "0xdeployer...",
      "name": "AgentToken",
      "symbol": "AGNT",
      "deployed_block": 28400000,
      "linked_agent": null,
      "recommendation": "Check registry for issuer wallet match, then review manually"
    }
  ],
  "skipped_uninitialized": 3,
  "timestamp": "2026-09-01T02:00:00.000Z"
}
```

If mainnet B20 is not yet active:
```json
{
  "ok": true,
  "b20_mainnet_active": false,
  "note": "Activation Registry reports no active B20 tokens. Mainnet indexing skipped.",
  "candidates": []
}
```

---

## What it will NOT do

- **Never** auto-set `isB20Token: true` — that remains a manual admin step always
- **Never** insert token contracts into `agent_wallet_claims` or books-eligible wallets
- **Never** classify factory events as revenue or include them in Agent GDP
- **Never** auto-attribute issuer wallets to agents without manifest confirmation
- **Never** index uninitiated tokens (`isB20Initialized` returned false)
- **Never** run if Activation Registry reports B20 is not yet live on mainnet

---

## Testnet demo and mainnet readiness

The Base Sepolia testnet demo (`chain=base-sepolia`) proves the full B20 pipeline end-to-end:

- detect → `detect_testnet_factory` mode (read-only factory log scan)
- index → `mode=single, chain=base-sepolia` (single token indexer)
- display → `/b20?chain=base-sepolia` (testnet tab with amber warning)
- interpret → Luca summary with testnet disclaimer
- separate → mainnet stats (`/api/b20/tokens`) exclude testnet tokens at DB level

**Zetta is mainnet-ready.** Once confirmed Base mainnet B20 tokens appear and
`isB20Initialized` returns true, the only steps required are:

1. Set `isB20Token: true` in `src/app/registry/data.ts` (after human review)
2. Deploy
3. Run `mode=from_registry, chain=base` dry run → then live
4. (Eventually) build this skill for automated discovery when manual sourcing becomes the bottleneck

---

## Planned trigger (when built)

```
# Every Sunday at 03:00 UTC — after observed truth at 02:00
0 3 * * 0  b20-factory-indexer
```

First run always in `b20_mainnet_active` check mode. If inactive, logs result and exits cleanly.

---

## Data integrity rules (unchanged)

- B20 token contracts are never books-eligible
- B20 token transfers are not operating revenue
- Issuer/deployer wallet is not automatically attributed
- B20 activity is excluded from Agent GDP unless classified through manifest-declared revenue/payment wallets
- `isB20Token: true` must always be set manually after human review
- Testnet B20 data (`chain=base-sepolia`) never enters production stats, Agent Books, or Agent GDP

---

## Build prerequisites

Before building this skill:

1. B20 mainnet must be confirmed active (Activation Registry check passes)
2. At least one real mainnet B20 token confirmed via `isB20` + `isB20Initialized`
3. Factory ABI selectors verified against deployed precompile bytecode
4. Manual sourcing flow has become the bottleneck (too many tokens to track manually)
5. Admin candidate review UI designed
6. Alchemy confirmed to support `eth_getLogs` for the factory on Base mainnet

Build this only when manual sourcing is no longer sufficient — not before.
