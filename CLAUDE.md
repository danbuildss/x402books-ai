# x402Books — Strategic North Star

## What we are building

```
trust infrastructure
for autonomous agents.
```

Not another AI agent. Not another crypto dashboard. Not another token ecosystem.

**Infrastructure.** Internally: the rating agency of the agent economy. Externally (until the track record exists): financial identity and trust infrastructure for autonomous agents.

**Wording discipline:** say "trust infrastructure" / "trust check" / "trust signals" — concrete, defensible. Avoid "trust layer" (reads as credit/guarantees/underwriting) and never market "rating agency" or "Moody's of agents" until the track record exists.

**The positioning stack:**

```
Company    x402Books — trust infrastructure for autonomous agents
Product    Trust Check API
Standard   .agent/wallets.json
Intel      Luca
Category   Financial Identity & Trust (KYA)
```

The wedge: **the Agent Wallet Manifest** (`.agent/wallets.json`).
The product: **the Trust Check API** (`GET /api/v1/kya/[slug]`).
The moat: **Trust Dataset + Trust Methodology + Trust Distribution.** The manifest creates the dataset. The methodology (/methodology) creates credibility. The API creates distribution. All three, or none of it works.

---

## The platform question — ask this before every build

```
the indexer gives you more agents;
the trust endpoint gives others a reason to depend on you.
```

Dependency is where infrastructure companies become valuable. The roadmap is a loop, not a ladder:

```
Trust Check API → external integrations → dependency
→ more data → better trust decisions → more integrations
```

Coverage features (indexers, registries) feed the loop. They are never the product.

**The north-star metric:**

```
how many agent-to-agent decisions
used a Trust Check before money moved?
```

0 → 10 → 100 → 1,000 → 10,000 = infrastructure. Everything else supports that
number. Instrumented live at `/api/stats` → `trust_checks` (today / 7d / unique
callers). Watch that, not profiles indexed, not stars, not followers.

---

## The architecture

```
x402Books  = infrastructure (index, classify, interpret, display)
Luca       = intelligence interface on top of x402Books
$LUCA      = ecosystem asset — NOT the product, NOT the narrative
```

- x402Books sees: wallet A sent USDC to wallet B
- Luca interprets: "recurring settlement activity detected."

That distinction matters. Never blur it.

---

## What x402Books does

1. **Identity layer** — wallet manifest, roles (treasury / fee / deployer / operator), verification, ecosystem indexing
2. **Registry layer** — agents, wallets, ecosystems, settlement history → public financial identity
3. **Classification layer** — settlements, revenue, treasury movement, internal transfers, inference spend → raw blockchain → operational finance
4. **Reporting layer** — treasury profiles, readable reports, operational summaries, financial verdicts, health signals

---

## How AEON fits

```
AEON        = execution + settlement layer
x402Books   = financial visibility layer
Luca        = operational intelligence layer
```

That triangle is correct. Protect it.

---

## How Surplus fits

```
Luca → requests inference → Surplus routes provider → x402Books records event → Luca generates financial interpretation
```

Financially self-aware agents. That's the loop.

---

## Current 30-day plan (June 2026) — supersedes the old 6-month table

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Ship Trust Check API (`/api/v1/kya/[slug]`) | code | ✅ done |
| 2 | Publish scoring methodology (`/methodology`) | code | ✅ done |
| 3 | AEON integration — "every AEON agent trust-checkable by default" | founder | pitch out |
| 4 | First external API caller (GC founder = design partner, not customer) | founder | in conversation |
| 5 | "Trust Check API" public announcement + How Trust Scores Work article | founder + Luca | after 3/4 |
| 6 | ERC-8004 indexer — coverage feed into the trust endpoint | code | queued |
| 7 | State of Agent Trust leaderboard | code | queued |

**The milestone that matters: one external system calling `GET /api/v1/kya/...` before taking an action.** Not stars, not followers, not registry count. A real dependency.

Company rebrand: only after the above — by then we know what we're becoming. (Name shortlist parked: Arbiter / Signet / Summa. "North" is dead — trademark conflict.)

---

## Phase arc (years)

1. Financial identity layer
2. Operational finance layer
3. Treasury infrastructure layer
4. Autonomous financial coordination layer
5. Global AI-native economic infrastructure

---

## Hard rules — never drift from these

**Build brick by brick. Not fast. Correct.**

**DO NOT build:**
- memecoin culture features
- pump/hype narratives
- fake AI personality
- over-tokenization
- shallow integrations
- growth hacks
- features before the current brick is solid

**DO NOT say:**
- "another AI agent"
- "token price is..."
- "market cap..."
- anything that frames success around $LUCA price

**DO build:**
- the Trust Check API and everything that feeds it
- wallet manifest flow (the dataset)
- published methodology (the credibility)
- integrations that create dependency (the distribution)
- verification infrastructure
- public agent profiles + clean registry UI (the human surface)

**Scoring discipline:**
- /methodology documents the ACTUAL code in src/lib/kya.ts — if the code changes, the page changes in the same PR
- trust_score and confidence stay separate numbers, always
- BLOCK only on explicit negative signals — absence of data is REVIEW, never BLOCK

---

## The one hard decision

```
product-first company.
token-second ecosystem.
```

Infrastructure companies compound slowly. Trust compounds slowly. Once infra wins — it is extremely difficult to replace.

---

## Guardrail — use this to check every build

Before shipping anything ask:
> Does this make autonomous agents more financially readable, trustworthy, or auditable?

If yes: ship it.
If no: don't build it.
