# Migration Ledger

SQL in this directory is applied manually via the Supabase SQL editor.
**Every new .sql file gets a row here. Update the status when you run it.**

Status legend: ✅ applied · ⏳ pending · ❓ unconfirmed (inferred from prod behavior — confirm against dashboard)

| File | Status | Evidence / notes |
|---|---|---|
| `registry-schema.sql` | ❓ likely applied | Registry reads/writes work in prod |
| `registry-claims.sql` | ❓ likely applied | Claim flow live (registry_claims rows exist) |
| `registry-import-candidates.sql` | ❓ likely applied | Dune/BANKR import flow references the table |
| `agent-economic-events.sql` | ❓ likely applied | Agent events flowing via /api/agent-events/log |
| `inference-events.sql` | ❓ likely applied | Surplus inference logging live |
| `tool-decision-events.sql` | ❓ likely applied | 181+ Nipmod events indexed |
| `tool-decision-events-v2.sql` | ❓ likely applied | project_id / decision_proof_hash in use |
| `luca-subagent-tables.sql` | ❓ confirm | PR #64 deploy checklist item — verify both tables exist |
| `comm-identities-migration.sql` | ❓ confirm | registry_agent_comm_identities queried by registry-db |
| `luca-verdicts-batch.sql` | ❓ confirm | One-off batch — confirm it ran |
| `agent-submissions.sql` | ❓ likely applied | /api/registry/submit writes to agent_submissions |
| `access-codes.sql` | ❓ likely applied | Access-code login live |
| `waitlist.sql` | ❓ likely applied | Waitlist form live |
| `stage-1-ledger.sql` | ❓ confirm | Legacy scanner era — may predate ledger |
| `growth-schema.sql` | ❓ confirm | Superseded by growth-tables-safe? Confirm which ran |
| `growth-tables-safe.sql` | ❓ confirm | "Safe" variant of growth-schema |
| `wallet-metadata-migration.sql` | ⏳ **PENDING — run before deploying PR #68** | Adds chain/role/confidence/evidence_source to registry_agent_wallets |

## How to confirm ❓ rows

Supabase dashboard → Database → Tables: check the table/columns exist.
Then flip the row to ✅ with the date, e.g. `✅ 2026-06-10`.
