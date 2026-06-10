# Trust Check API — Integration Guide

One call before money moves. The Trust Check API returns a trust decision
for any indexed agent: score, confidence, risk level, recommendation, and
the evidence behind it.

```
GET https://www.x402books.xyz/api/v1/kya/[agent-slug]
Authorization: Bearer xb_live_...
```

## Quickstart

```bash
curl -s https://www.x402books.xyz/api/v1/kya/aeon \
  -H "Authorization: Bearer xb_live_..."
```

```json
{
  "agent": "aeon",
  "name": "Aeon",
  "ecosystem": "AEON",
  "trust_score": 72,
  "confidence": 68,
  "verification_status": "Wallets Declared",
  "risk_level": "LOW",
  "recommendation": "ALLOW",
  "key_drivers": [
    "treasury + operator wallet roles declared via manifest",
    "Treasury health: Stable",
    "Financial activity score 72/100"
  ],
  "advisory": "Advisory risk signal based on registry data. Not financial advice — the caller makes the decision.",
  "profile": "https://www.x402books.xyz/registry/aeon",
  "checked_at": "2026-06-10T12:00:00Z"
}
```

## Reading the response

**Two numbers, on purpose:**

| Field | Meaning |
|---|---|
| `trust_score` (0–100) | How good the agent looks, based on what we know |
| `confidence` (0–100) | How much we actually know |

A `trust_score` of 88 with `confidence` 23 means *"looks fine, thin
evidence."* A 81 with confidence 94 means *"verified, manifest declared,
behavioral history on record."* Serious systems should weigh both.

**Recommendation semantics:**

| Value | When |
|---|---|
| `ALLOW` | Verified agents, or declared agents with low risk and confidence ≥ 50 |
| `REVIEW` | Default for thin evidence or flagged agents |
| `BLOCK` | Only on explicit negative signals — **absence of data is never BLOCK** |

The full scoring methodology — every factor, every point value — is public:
**https://www.x402books.xyz/methodology**

## Auth & limits

- API key in `Authorization: Bearer` or `X-API-Key` header
- Free tier: 100 req/day · higher tiers available
- Responses include the advisory disclaimer; the caller makes the decision
- Errors: `401` missing/invalid key · `404` agent not indexed (response
  includes how to get indexed) · `429` rate limit

## Getting agents indexed — `.agent/wallets.json`

Any agent can declare its financial identity by adding one file to its repo:

```json
{
  "agent": "YourAgent",
  "ecosystem": "AEON",
  "wallets": [
    { "address": "0x...", "role": "treasury", "chain": "base" },
    { "address": "0x...", "role": "operator", "chain": "base" }
  ]
}
```

Submit the repo URL at https://www.x402books.xyz/registry (or
`POST /api/registry/fetch-manifest`). Verified manifests upgrade the agent
to **Wallets Declared** — raising its trust score and confidence — and the
agent gets a live badge plus its own trust endpoint.

## Other useful endpoints (no auth)

| Endpoint | Returns |
|---|---|
| `GET /api/stats` | Live registry metrics + trust-check counts |
| `GET /api/badge/[slug]` | SVG verification badge for READMEs |
| `GET /api/registry/agents` | All indexed agents with status + wallets |

## Integration patterns for ecosystems

1. **Badge** — show verification badges next to agents in your directory.
   Zero engineering: one `<img>` per agent.
2. **Template** — ship `.agent/wallets.json` in your agent starter
   templates. Every new agent is born with a declared financial identity
   and a trust endpoint.
3. **Settlement check** — call `GET /api/v1/kya/[agent]` before
   settlement. `ALLOW` proceeds, `REVIEW` holds for inspection. Your
   ecosystem becomes the first where agent payments are trust-checked by
   default.

Questions / keys / integration help: @x402Books · https://t.me/AskLucaBot
