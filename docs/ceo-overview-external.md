# Zetta — Company Overview
**June 2026**

---

## What We Are Building

Zetta is building **financial intelligence for the agent economy.**

Autonomous agents are generating real revenue, incurring real expenses, and holding real treasury positions. Most of this activity is invisible — the transactions are on-chain, but there is no financial identity layer to interpret them.

Zetta is that layer.

---

## How It Works

**Step 1 — Agents declare their wallets.**
An agent team publishes a simple JSON file — the Agent Wallet Manifest — declaring their treasury, fee recipient, and operator wallets.

**Step 2 — Zetta attributes the activity.**
Zetta reads the declared wallets, classifies on-chain activity into operational finance categories (revenue, expenses, internal transfers), and applies strict rules: no manifest means no books, token transfers are not revenue, gross inflow is not operating revenue.

**Step 3 — Agent Books are live.**
Each attributed agent gets a public financial profile: 30-day revenue, expenses, net income, and treasury position — grounded in on-chain data, not estimates.

**Step 4 — Luca explains the data.**
Luca is Zetta's AI financial analyst. She reads the books, monitors treasury positions, analyzes revenue patterns, writes the State of the Agent Economy reports, and exposes a callable Skills API for agents and developers.

---

## The Three Layers

| Layer | Role |
|-------|------|
| **Zetta** | Infrastructure — indexes agents, attributes wallets, classifies transactions, produces financial data |
| **Luca** | Intelligence — interprets Zetta data, writes reports, answers financial queries, exposes API skills |
| **$LUCA** | Access — community token that gates API rate limits and tier upgrades |

---

## What Is Live

**Agent Registry (`/registry`)**
A public financial directory of autonomous agents. Agents with declared manifests have live financial profiles — revenue, expenses, net income, treasury health, and a confidence label. The registry currently indexes over 80 agents across Base ecosystems including BANKR, Virtuals, and AEON. The number of agents with live financial books grows as more manifest declarations are submitted.

**Leaderboard (`/leaderboard`)**
Attributed agents ranked by 30-day operating revenue. Only agents with declared manifests appear — there is no synthetic data.

**Luca Skills API**
Seven callable financial intelligence functions available to developers and agents:

- **Wallet Audit** — classifies any Base address (EOA, token contract, treasury contract, books eligibility)
- **Agent Books** — full financial statement for a given period
- **Treasury Monitor** — stablecoin balances across declared wallets with health signal
- **Revenue Analysis** — gross inflow vs operating revenue breakdown with quarantine rate
- **Registry Check** — agent lookup by slug, name, or address
- **Luca Report** — composite output: identity, books, treasury, and Luca's narrative verdict
- **B20 Token Analysis** — token identity, issuer, linked agent, and activity summary

**Research — State of the Agent Economy**
Luca publishes weekly, monthly, and quarterly financial reports on the agent economy. The inaugural Q2 2026 report is live. Reports are grounded in attributed on-chain data; the quality of each report improves as more agents declare manifests.

**Developer API**
A tiered public API for accessing agent financial data, with rate limits gated by $LUCA balance (Free: 100 req/day → Enterprise: 2,000 req/day). API key management at `/dashboard/keys`.

**B20 Token Intelligence**
Identity and activity tracking for B20-standard tokens — issuer, owner, linked agent, and mint/burn history. Token activity is tracked separately from operating revenue.

**ERC-8004 Integration**
Zetta indexes agent identities from the on-chain ERC-8004 registry. This is identity data — it identifies who an agent is. Financial attribution still requires a declared wallet manifest.

---

## What We Are Building Next

- **Embeddable report cards** — agents share their books anywhere (X, Bankr, their own site)
- **Automated manifest review** — reduce time from submission to live books
- **Partner integrations** — Bankr, Virtuals, OpenServ, and Base ecosystem partners to increase attribution rate
- **Treasury alerts** — real-time signals for low runway or large movements
- **Revenue model** — tiered API access, premium research, and enterprise monitoring

---

## What Makes Zetta Different

**Strict attribution.** A wallet is only books-eligible if the agent declared it in a manifest. Discovered wallets, inferred wallets, and token contracts do not produce books.

**No synthetic data.** Every number comes from on-chain activity against declared wallets. No estimates, no imputations, no projections.

**The right definitions.** Gross inflow is not operating revenue. Token transfers are not earnings. ERC-8004 is identity — not financial attribution. These distinctions matter.

**Composable intelligence.** Luca's Skills API is callable by any agent or application. Financial intelligence becomes a building block, not just a dashboard.

---

## Current Status

The core platform is built and running in production. The primary growth variable is **attribution rate** — the share of indexed agents that have declared wallet manifests and have live financial books. This is an adoption and distribution challenge, not an engineering one.

The infrastructure is mostly in place. The next phase is distribution, validation, and monetization.

---

## Contact

[zettaai.co](https://www.zettaai.co)
