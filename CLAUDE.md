# x402Books AI — Claude Code Context

## What We're Building

**x402Books AI** is an onchain accounting platform that turns Base wallet activity into clean financial reports for autonomous agents and their operators. It's built on the x402 payment protocol and combines blockchain data with AI analysis.

> "Readable books for the agent economy."

Live at [x402books.xyz](https://x402books.xyz)

---

## Ecosystem Repos

| Repo | Description |
|------|-------------|
| **x402books-ai** *(this repo)* | The platform — wallet audits, AI transaction categorization, financial health scores, agent-readable reports, developer API, and agent registry. Powered by Claude on Base. |
| **luca-aeon-skills** | Luca's financial intelligence skills for Aeon agents. Wallet scanning, treasury monitoring, and financial reports — powered by x402Books AI on Base. |
| **agent-wallet-manifest** | Open standard for AI agents to declare verified wallets in their repo. One file. Machine-verifiable. Built for the agent economy. |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Auth | Privy (wallet-based) |
| Database | Supabase (PostgreSQL) |
| Blockchain | Alchemy, BANKR API, Virtuals Protocol, Dune Analytics |
| AI | Claude (Anthropic) |
| Deploy | Vercel |

---

## Core Features

- **Wallet Audits** — Full financial breakdown for any Base wallet address
- **AI Categorization** — Claude-powered transaction classification (revenue, expenses, gas, swaps, treasury)
- **Financial Scoring** — Treasury health, inflow/outflow tracking, anomaly detection
- **Agent Reports** — Structured summaries built for autonomous agents to consume
- **Portfolio Tracking** — Live token balances across BANKR and Virtuals ecosystems
- **Public Reports** — Shareable report pages at `/report/[wallet]`
- **Agent Registry** — Directory of indexed agents with verification and ecosystem filtering
- **Developer API** — REST endpoints with `$LUCA` token-gated rate limits

## AI Agent: Luca

**Luca** is the AI accountant agent (Telegram: `@AskLucaBot`) that answers natural language questions about wallet finances. Powered by the same x402Books AI stack.

## Token: $LUCA

Gates API tier access:
- Free: 100 req/day
- Holder: 500 req/day
- Whale: 2,000 req/day

---

## Development Branch

Active development happens on `claude/x402books-overview-vbKnc`.
