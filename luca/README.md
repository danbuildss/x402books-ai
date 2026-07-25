# Luca — Financial Analyst of Zetta

Luca explains Zetta's published financial data in plain language. He reads. He never computes.

The ledger decides what is true. Luca decides how to explain it.

## Layout

```
luca/
  prompts/luca-v1.md        # system prompt (constitution) — version like code
  skills/*.skill.json       # read-only skill specs wired to Zetta APIs
  src/verify-response.ts    # deterministic post-processor (figure citation + terminology)
  evals/luca-evals.jsonl    # golden eval cases
  evals/run-evals.ts        # CI-blocking eval runner
```

## Wiring into Hermes (GPT-5.4)

1. **System prompt** — paste `prompts/luca-v1.md` as Luca's system prompt. Version-bump the file on every change; treat prompt edits as deploys.

2. **Skills** — register each `skills/*.skill.json` as a Hermes tool. Env vars:
   - `ZETTA_BASE_URL` — e.g. `https://zetta…`
   - `ZETTA_INTERNAL_SECRET` — Hermes secret store, never in the prompt (internal skills only)

3. **Verification hook** — register `verifyLucaResponse` + `checkForbiddenPhrases` from `src/verify-response.ts` as a response post-processor. Any uncited figure or forbidden phrase → reject the draft and regenerate with the reason injected. Do NOT rely on the prompt alone to enforce this.

4. **Access control** — pass an `is_operator` flag with each chat session. Internal skills (`get_revenue_quality`, `get_unresolved_items`, `get_anomalies`) may only be invoked when `is_operator` is true.

## Backend endpoints the skills expect

Public (PR #202 surface, plus small additions):
- `GET /api/v1/financial-intelligence/{slug}` — latest published snapshot ✅ exists
- `GET /api/v1/financial-intelligence/{slug}/compare?from=&to=` — **to add**
- `GET /api/v1/financial-intelligence/leaderboard?metric=&period_end=` — **to add**

Internal (behind `internalAuth`):
- `GET /api/admin/financial-intelligence/revenue-quality?agent_slug=&period_start=&period_end=` — **to add**
- `GET /api/admin/financial-intelligence/unresolved?agent_slug=&limit=` — **to add**
- `GET /api/admin/financial-intelligence/anomalies?agent_slug=&status=` — **to add**

All five "to add" endpoints are read-only queries over tables created by PR #202's migration.

## Evals

```bash
npx tsx luca/evals/run-evals.ts --agent-url=$LUCA_CHAT_URL
```

10 golden cases covering: volume-vs-revenue traps, missing data, concentration risk, swaps≠revenue, deferred revenue, comparison guards, no-investment-advice, anomaly framing. Add a case for every bug you catch in the wild. CI fails if any case regresses.

## Luca's own financials

Luca is registered on Zetta with his own manifest + verified wallet. His service revenue flows through the same pipeline he explains — the reference onboarding example for every agent team.
