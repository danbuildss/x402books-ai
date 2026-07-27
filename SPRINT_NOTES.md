# SPRINT_NOTES — D0 Orientation Map

Shared reference for phases P0–P9. Discovery only — no behavior was changed.
Generated 2026-07-15 against `main` @ a149d24.

---

## 1. Stack & layout

- Next.js 15 (App Router) + React 19 + TypeScript, Supabase (`@supabase/supabase-js`), deployed on Vercel (`vercel.json` is minimal — framework only; crons are NOT declared there).
- Source lives entirely under `src/` (`src/app` routes, `src/lib` domain logic, `src/components` shared UI, `src/__tests__` tests).
- `skills/zetta/*` — Luca skill definitions (agent-books, wallet-audit, treasury-monitor, revenue-analysis, b20-token-analysis, luca-report, registry-check, index-observed-truth, b20-factory-indexer). Served via `/api/luca/skills/*`.
- `schemas/` — JSON Schemas: `agent-wallet-manifest.schema.json`, `books-eligibility.schema.json`, `wallet-role-graph.schema.json`.
- `scripts/` — Python validators (`validate_agent_manifest.py`, `normalize_wallet_graph.py`, `assess_books_eligibility.py`). Not wired into CI.

## 2. Key views (pages)

| Concern | Route | Files |
|---|---|---|
| Registry list view | `/registry` | `src/app/registry/page.tsx`, `registry-client.tsx`, `types.ts` (canonical type defs), `data.ts` (static seed `AGENTS[]`) |
| Agent profile page | `/registry/[slug]` | `src/app/registry/[slug]/page.tsx`, `profile-client.tsx`, `slug.ts`; embeds at `[slug]/card` and `[slug]/embed`, OG image at `opengraph-image.tsx` |
| Economics / books | `/luca-admin/agent-economics` (admin) | `src/app/luca-admin/agent-economics/page.tsx`; public books data flows through `/api/registry/agents/[slug]/books` + `/api/v1/agent-books/[slug]` |
| Admin (internal ops) | `/luca-admin/*` | attribution-health, revenue-audit, revenue-confidence, revenue-accuracy-report, erc8004-ingestion, address-classification, b20-intelligence, agent-economics, registry-updates |
| Admin (imports) | `/admin/import-candidates` | `src/app/admin/import-candidates/page.tsx` |
| Other public | `/leaderboard`, `/wallets`, `/transactions`, `/report/[wallet]`, `/reports`, `/research/[slug]`, `/b20/[address]`, `/manifest/*`, `/dashboard/*`, `/luca`, `/validate` | |

## 3. Data pipeline (ingest → normalize → classify → books → Luca)

1. **Ingest**: `src/lib/truth-engine/chain-fetcher.ts` — Alchemy first, Etherscan/Basescan fallback (`providers/alchemy.ts`, `providers/etherscan.ts`). Also `src/lib/alchemy.ts`, `src/lib/dune.ts` for other paths. Cron entry: `/api/cron/index-observed-truth`.
2. **Normalize**: `NormalizedTransaction` (chain-fetcher.ts) — `direction: "inbound" | "outbound"`, lowercase addresses, ISO timestamps. Wallet graph normalization in `truth-engine/wallet-graph.ts`.
3. **Classify**:
   - `truth-engine/revenue-classifier.ts` — deterministic, pure. `Classification = settlement_revenue | fee_received | inference_spend | treasury_movement | token_distribution | external_expense | unknown`, each with `confidence: high | medium | low` + `classification_reason`.
   - `src/lib/luca-classify.ts` — settlement-pattern interpretation over categories.
   - `src/lib/ai-categorize.ts` + `/api/categorize` — AI-assisted categorization into `LedgerCategory`.
4. **Books**: `src/lib/agent-books.ts` (`buildAgentBooks`, `buildAgentBooksAudit`, cache in `agent_books_cache`), history in `agent-books-history.ts`, eligibility in `truth-engine/books-eligibility.ts` (eligible roles: `treasury, revenue, fee, operator`) + DB trigger (`20260706000002_books_eligible_trigger.sql`). Cron: `/api/cron/refresh-books`.
5. **Luca**: `src/lib/luca-tools.ts`, `/api/luca`, `/api/luca/chat`, `/api/luca/economics`, `/api/luca/skills/*`, and machine-facing `/api/v1/luca/*` (analyze, economy, inference, agent-read, surplus/*).

Ledger persistence: `src/lib/ledger-store.ts` writes `wallets`, `transactions`, `reports`. Ledger domain types in `src/lib/ledger.ts`.

## 4. API surface under `/api/v1/`

`agent-books/[slug]` (+`/history`), `agent-events`, `agent-financial-state`, `agent-report`, `agent-revenue/[slug]`, `agent-truth/[slug]`, `agent/[slug]/confidence`, `agent/[slug]/revenue-audit`, `attribution-health`, `categorize`, `full-report`, `ledger-summary`, `luca/*` (agent-read, analyze, economy, inference, surplus/{buyer-key,challenge,models,prices,status,webhook}), `predictions/agent-manifest-milestone`, `scan`, `transactions`. Auth helper: `src/lib/v1-auth.ts`; keys via `src/lib/api-keys.ts` + `/api/developer/keys`.

Non-v1 registry API: `/api/registry/{agents, agents/[slug]/books, approve, claim, claims, comm-identities, economics, fetch-manifest, luca-update, manifest-direct, momentum, pending, status, submissions, submit, wallets}`.

## 5. Real status enums (canonical source: `src/app/registry/types.ts`)

- **`VerificationStatus`** (DB `registry_agents.verification_status`, text, default `'Candidate'`):
  `"Candidate" | "Needs Verification" | "Wallets Declared" | "Claimed" | "Verified" | "Luca Managed" | "ERC-8004 Indexed" | "Awaiting Manifest"`
- **`Health`** (DB `registry_agents.treasury_health`, text, default `'Pending'`): `"Active" | "Inactive" | "Unverified" | "Pending" | "Stable"` — explicitly descriptive, not a rating.
- **`OutreachStatus`** (internal CRM, `registry_agents.outreach_status`): `"Not started" | "In progress" | "Connected" | "Manifest submitted"`
- **`WalletLabel`**: `"candidate wallet" | "verified wallet" | "treasury" | "deployer" | "likely treasury" | "likely revenue wallet" | "likely fee recipient" | "likely expense wallet" | "unknown role"`
- **`AddressType`** (`registry_agent_wallets.address_type`): `"eoa" | "token_contract" | "proxy_contract" | "treasury_contract" | "vault" | "smart_contract" | "unknown"`
- **Pending-update workflow** (`registry_pending_updates`): `update_type: "new_agent" | "score_update" | "wallet_update" | "status_change"`; `status: "pending" | "approved" | "rejected"` (default `'pending'`).
- **Transactions** (`public.transactions`): `direction IN ('income','expense','internal')` (CHECK constraint), `category` text default `'unknown'`, `risk_flag` default `'none'`. TS-side `LedgerCategory` (19 values, `src/lib/ledger.ts:33`) and `LedgerRiskFlag` (9 values, `ledger.ts:53`) are NOT DB-enforced.
- **Books confidence**: `BooksConfidence = "high" | "medium" | "low"` (`agent-books.ts:52`).

IMPORTANT: none of these are Postgres enums — all are `text` columns; only `transactions.direction` has a CHECK constraint. Enum drift between TS and DB is possible and unchecked.

## 6. Wallet attribution / provenance — exact field names

On `registry_agent_wallets` (DB) / `AgentWallet` (TS, `registry/types.ts:64`):

| DB column | TS field | Allowed values (by convention, NOT DB-enforced) |
|---|---|---|
| `role` | `role` | `treasury \| fee \| deployer \| operator \| unknown` (default `'unknown'`) |
| `chain` | `chain` | `base \| ethereum \| solana \| …` (default `'base'`) |
| `confidence` | `confidence` | `declared \| inferred \| confirmed` (DB default `'declared'`) |
| `evidence_source` | `evidenceSource` | `manifest \| luca \| admin` (nullable; backfilled to `'admin'` by `migrations/2026-06-22_attribution-truth-fix.sql`) |
| `address_type` | `address_type` | see `AddressType` above |
| `label` | `label` | see `WalletLabel` above |
| `notes` | `notes` | free text |

Agent-level provenance: `registry_agents.evidence_sources text[]` (TS `evidenceSources: string[]`) — free-form strings (e.g. "Operator manifest").

Books-eligibility rule (trigger + `truth-engine/books-eligibility.ts`): wallet counts toward books when `evidence_source = 'manifest'` AND `address_type = 'eoa'` AND role ∈ {treasury, revenue, fee, operator}. Note the mismatch: the DB wallet `role` convention lists `fee/operator/...` but the eligibility set includes `revenue`, which is not in the documented role comment — both exist in data.

Truth-engine provenance tables (`src/lib/truth-engine-db.ts`): `registry_manifest_submissions`, `registry_wallet_claims`, `books_eligibility_snapshots`, `registry_evidence_packets`, `revenue_classification_events`.

## 7. Supabase schema / migrations

- **Canonical**: `supabase/migrations/` — baseline `20260706000000_baseline_schema.sql` (tables: `registry_agents`, `registry_agent_wallets`, `registry_pending_updates`, `wallets`, `transactions`, `reports`, `agent_books_cache`, …), then slug/address_type, books-eligible trigger, RLS policies, tx-unique fix, access-codes wallet, submissions IP.
- **Ad-hoc/legacy**: root `migrations/` (June 2026 one-offs: attribution-truth-fix, erc8004-schema, b20-tables, aeon-under-review, manifest-wallet-cleanup, b20-submission-field) and `supabase/archive/` (pre-baseline SQL). Assume anything not in `supabase/migrations/` is already applied manually — do not re-run.
- Registry can also fall back to static seed `src/app/registry/data.ts` (`AGENTS[]`) — DB is source of truth via `src/lib/registry-db.ts`, which maps rows ↔ `Agent`.

## 8. Definition-of-Done commands (verified)

| Check | Command | Status |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ passes on main |
| Lint | `npm run lint` (next lint, `.eslintrc.json`, key rules downgraded to warn) | ✅ available |
| Build | `npm run build` | in CI |
| Tests | `npm test` → `bun test src/__tests__` | ⚠️ **bun is not installed on this machine** — tests cannot run locally as-is; CI (`.github/workflows/ci.yml`) runs typecheck + lint + build but **never runs tests** |

Only 2 test files exist: `src/__tests__/security.test.ts`, `wallet-eligibility.test.ts`.

## 9. Spec assumptions vs. reality (deltas for P0–P9)

1. **No tag system exists.** P0's "tag system" has no counterpart in code or DB. The closest primitives are `VerificationStatus` (single-value text on `registry_agents`) + `WalletLabel`/`AddressType` on wallets. Any tag model must be net-new (table or `text[]`) and needs an explicit mapping from the 8 existing `VerificationStatus` values.
2. **Statuses are text, not enums.** No Postgres enum types; adding/renaming states is a data migration + TS union change, and nothing currently prevents drift.
3. **`confidence` and `evidence_source` values are convention-only** (comments in `types.ts`), never CHECK-constrained. Real data includes backfilled `evidence_source='admin'` rows that were originally "early discovery" attributions — treat `admin` provenance as weakest, not equivalent to manifest.
4. **Two classification vocabularies coexist**: truth-engine `Classification` (7 values) and `LedgerCategory` (19 values). They are not mapped to each other anywhere; specs that assume one canonical classification must pick a side or add a mapping.
5. **"Economics/books page" is admin-only** (`/luca-admin/agent-economics`); public books exposure is API + profile-page sections, not a standalone public books page.
6. **Test DoD is aspirational**: CI has no test step and bun is missing locally. If a phase's DoD says "tests pass," fix the harness first (install bun, or switch to a node runner, and add a CI step).
7. **Slugs are derived**, not first-class: `registry_agents` keyed by `name`; slug logic in `src/app/registry/[slug]/slug.ts` + migration `20260706000001_add_slug_and_address_type.sql`.
8. **Crons exist as routes only** (`/api/cron/*` protected paths); no `vercel.json` cron schedule is committed — scheduling is configured outside the repo.

---

## 10. P0 addendum (implemented 2026-07-15) — reference for P1–P9

- **Scope lock**: `NEXT_PUBLIC_BANKR_ONLY=true` (build-time; `src/lib/focus.ts` exports `BANKR_ONLY`, `FOCUS_ECOSYSTEM`, `scopeAgents()`). Public pages + `/api/registry/agents` are Bankr-scoped; admin is never scoped and uses the new authed `GET /api/admin/registry/agents` (full `Agent` + `revenue_usd`).
- **Tag vocabulary** (const arrays in `src/app/registry/types.ts` are the single source; DB CHECK-enforced by `supabase/migrations/20260715000001/2`):
  - stored, admin-edited: `focus_status`, `bankr_priority`, `metadata_status`, `outreach_status` (new 8-value snake_case vocab; legacy values preserved in `outreach_status_legacy`)
  - stored, trigger-owned: `wallet_status` (from `registry_agent_wallets` aggregate), `profile_status` (from `verification_status`)
  - derived at read time (`src/lib/status-tags.ts`): `books_status` (cache TTL), `data_status` (`last_checked` age)
- **PublicAgent** now includes `slug` and `treasuryHealth`; still excludes all CRM tags. `/api/registry/agents` no longer leaks `outreachStatus`/`adminNotes`/`priority`.
- **Agent type** gained required `slug` + the eight tag fields; `rowToAgent`/`agentToRow`/static `data.ts` handle them. `approvePendingUpdate` deliberately does NOT accept tag fields.
- Tests: `src/__tests__/status-tags.test.ts` (bun harness still absent locally/CI — see §9.6).

---

## 11. Sprint completion (2026-07-27) — P0–P9 all code-complete

All phases merged to `main` (`7dda29b`). DoD green: typecheck 0 · lint 0 · **181 tests** · build clean (both flag states). CI runs the full gate on every PR.

| Phase | Delivered | Key files |
|---|---|---|
| P0 | Scope lock + tag system + 2 migrations | `focus.ts`, `20260715*` migrations |
| P1 | Data-quality audit route/script/skill | `bankr-audit.ts`, `scripts/bankr-data-audit.sh` |
| P2 | Registry financial terminal | `registry-client.tsx`, `filters.ts` |
| P3+P4 | Single-scroll profile + operator books | `books-presenter.ts`, `books-sections.tsx` |
| P5 | Pipeline observability, fail-loud | `pipeline-observability.ts`, `20260717*` migration |
| P6 | Bankr Queue (6 admin views) | luca-admin `BankrQueueSection` |
| P7 | Claim/outreach CTAs + pending states | profile `ProfileCtas`, `ClaimBanner` |
| P8 | Agent-scoped keys + isolation tests + docs | `v1-auth.ts`, `agent-scope.test.ts`, `docs/API_BANKR.md` |
| P9 | Messaging rules enforced in CI | `messaging-rules.test.ts` |

## 12. QA checklist run (3 Bankr agents: bankr, helixa, botcoin)

Spec named **Luca** as a test agent — Luca is ecosystem `Base` and intentionally 404s under the P0 scope lock (verified). Substituted a third Bankr agent.

| Check | Result | How verified |
|---|---|---|
| P3 layout order, bio before scores | ✅ | HTML marker positions: bio→status→metrics→verdict→books→attribution→data-quality. One documented deviation: for `no_books` agents the claim CTA renders directly after Books ("the CTA IS the next action") instead of position 11 — deliberate merged design. |
| Metrics real or explicitly missing, never fake zeros | ✅ | 0 occurrences of `$0.00` on all 3 profiles; unattributed metrics render "—" with reason |
| Luca verdict right after metrics, reflects known/missing | ✅ | verdict section immediately follows metrics; missing list populated (e.g. "Wallet attribution (no books-eligible manifest wallet)") |
| Wallet attribution shows source provenance | ✅ | source pills + legend (manifest/admin/inferred/candidate) render; bankr shows `candidate` |
| Token activity ≠ operating revenue | ✅ (by test) | presenter invariant tests; agent-token is its own row — no attributed agent exists in local fallback data to eyeball; re-verify once on prod |
| Books status / freshness / last-indexed / next-action populate | ✅ | Data Quality block fully rendered on all 3, concrete next action each |
| Registry row matches profile | ✅ | API `needs_verification/no_books/partial` == profile badges "Needs Verification/No Books/Partial" (bankr; spot-checked others) |
| Pipeline failure visible, no silent empty state | ✅ (by test) | data_status=failed overlay + admin section unit-tested; needs prod `pipeline_failures` table for a live example |
| Copy follows P9 rules | ✅ | `messaging-rules.test.ts` scans every public tsx in CI |
| Scoped key returns own data, denied for others | ✅ (by test) | `agent-scope.test.ts` security-property tests; live-key check needs a prod-issued `agent:{slug}` key |

**Caveat:** local data is the static fallback (no Supabase env), so "✅ (by test)" rows are enforced by the unit suite rather than observed live. One prod pass over a live-books agent completes these visually.

## 13. P0/P1 backlog — Bankr reliability (CTO deliverable #7)

**P0 (blocking full value of shipped work):**
1. Apply `supabase/migrations/20260717000001_pipeline_failures.sql` in prod (P5 has no table until then).
2. Run the first production data audit (`scripts/bankr-data-audit.sh` with prod secret); commit `reports/` artifact — this is the real P1 deliverable's numbers.
3. Add Hermes schedules: weekly `bankr-data-audit` (Mon 06:00 UTC).
4. Issue `agent:{slug}` keys to pilot Bankr teams; verify one live 403 cross-agent denial.
5. Fill bios for top Bankr agents (admin Edit Agent Profile) — every profile currently shows the empty state.

**P1 (reliability debt, next sprint):**
6. Tracked migrations for hand-created prod tables (`registry_manifest_submissions`, `luca_subagent_runs`, `registry_claims`) — schema currently not reproducible.
7. `outreach_status_legacy` cleanup migration once the new vocabulary is confirmed in practice.
8. Wallet-level v1 endpoints (`ledger-summary`, `full-report`, `scan`) are unscoped by design (public chain data) — consider verifying wallet-belongs-to-agent for scoped keys.
9. Gas tracking (no ledger category exists — expense breakdown honestly shows "not tracked").
10. `valueUsd` pricing for provider-normalized transactions (currently honest-blank).
11. Sync `docs/API_BANKR.md` into the GitBook (`DOCS_URL`).
12. Visual QA pass on a live-books agent post-deploy (attributed rendering was test-verified only).
