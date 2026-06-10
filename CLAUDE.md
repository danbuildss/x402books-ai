# x402Books Product Direction (Read Before Building)

## What x402Books is

x402Books is building **financial intelligence for the agent economy**.

The goal is to answer:

- Are agents actually moving money?
- How much are they earning?
- How much are they spending?
- Are they profitable?
- What does agent GDP look like?
- Which agents are real economic actors versus narratives?

**Mission: make the financial activity of autonomous agents understandable to humans.**

## What x402Books is NOT

We are NOT building:

- A trust layer
- An identity protocol
- A reputation network
- A credit scoring system
- A KYA company
- A generic agent verification platform

Trust and verification may exist as supporting signals, but they are not the company.

## The Core Product Flow

```
.agent/wallets.json
↓
Wallet Attribution
↓
Transaction Collection
↓
Transaction Classification
↓
Revenue & Expense Analysis
↓
Treasury Intelligence
↓
Profitability Analysis
↓
Agent Financial Reports
```

This is the product.

## Why the Manifest Exists

The Agent Wallet Manifest is not primarily a trust primitive. The manifest exists
because **we cannot do financial intelligence without attribution.**

We must know: which wallets belong to the agent, which is treasury, which receives
revenue, which pays expenses, which belongs to operators. Without attribution, the
financial analysis is meaningless.

## North Star Metrics

Optimize for:

1. Agent GDP tracked
2. Revenue attributed
3. Expenses classified
4. Verified agent wallets
5. Number of agents with readable books

Do NOT optimize for: trust scores, reputation scores, KYA requests, verification
badges, identity metrics — unless they directly improve financial intelligence.

## Product Hierarchy

```
Headline:    Revenue · Expenses · Profitability · Treasury · Runway · Cash Flow
Supporting:  Wallet Attribution · Verification · Trust Signals · Risk Signals
```

Financial intelligence is the product. Trust is a feature.

## Build Filter

Before building anything, answer:

> Does this help us better answer:
> "What is actually happening financially across the agent economy?"

If the answer is no, challenge the build before proceeding.

## Current Priority

The highest priority is NOT more trust features.

The highest priority is building the missing join:

```
Manifest Wallets + Ledger Engine + Transaction Classification
==============================================================
Per-Agent Financial Statements
```

That is the core missing product. Everything else is secondary until this exists.

---

## Engineering discipline (carried forward)

- **Books integrity rule:** full financial statements ONLY for agents with declared
  wallet attribution. Clearly-labeled activity proxies for everyone else. Never
  blur the two. A wrong revenue number is fatal; "unattributed" is honest.
- **Internal transfers between an agent's own attributed wallets are never
  revenue or expense.**
- Published explanations must match shipped code (the /methodology rule —
  applies to any scoring or books math we publish).
- Security invariants stay: fail-closed internal auth, rate limits on public
  writes, session-owned API keys, no raw DB errors to clients.
- Wording: "financial intelligence for the agent economy." Avoid marketing
  "trust layer", "rating agency", "Moody's of agents". Trust Check
  (/api/v1/kya) remains a supporting feature, not the headline.
