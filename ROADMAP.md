# x402Books AI — Roadmap

Last updated: May 2026

---

## Current Stage

**Early production / operator-assisted public alpha.**

The core product is real and working:
- Wallet audit workflows
- Registry research and candidate scoring
- Anomaly detection and fee-flow analysis
- Agent financial summaries
- Live API with key-based auth and $LUCA token tiers

Not yet at full scale:
- Wallet verification is still research-driven, not automated
- Registry is candidate-based, not fully verified
- Agent coverage is growing but not ecosystem-wide
- Monetization is API-tier based, not pay-per-use yet

---

## Partnership Strategy

### Recommended sequence this week: Bankr → Gitlawb → Primer → Virtuals (phase 2)

---

### 1. Bankr — Distribution + real treasury flows (highest priority)

**Why:**
Bankr is the clearest place on Base where agent money is already moving — fee routing, treasury automation, x402-linked agent workflows, self-funding agents. Luca is the natural intelligence layer on top of that.

**What we can offer:**
- Luca-powered treasury health checks for Bankr agents
- Fee-flow analysis and wallet breakdowns for top Bankr launches
- Registry entries for Bankr-native agents
- "Is this agent economically working?" financial reports

**What Bankr provides us:**
- Distribution into the most active agent-finance surface on Base
- Real transaction volume = Luca's strongest proof-of-value
- Base-native credibility for x402Books

**Pitch:**
> Bankr powers agent finance. x402Books explains it, scores it, and makes it auditable.

**DM copy:**
> Bankr is building the financial rails for self-funding agents. x402Books can be the intelligence layer on top: wallet labeling, fee-flow analysis, treasury health, anomaly detection, and public-safe agent financial reporting. We'd like to pilot Luca on a few Bankr agents and turn that into a repeatable audit layer.

**Phase 1 deliverables:**
- 3–5 public-safe Bankr agent registry entries
- 2–3 wallet breakdowns posted publicly
- 1 treasury-health audit example
- 1 x402/pay-per-audit concept tied to Bankr agents

---

### 2. Gitlawb — Wallet verification + registry standard (best strategic)

**Why:**
The registry's biggest weakness isn't analysis — it's verification. Gitlawb's DID/repo/signed-identity system can become the provenance layer Luca needs to move registry entries from "candidate wallets" to "verified wallets."

**What we can offer:**
- Luca ingests Gitlawb wallet declarations and generates verified registry entries
- Financial profile drafts for any agent with a declared wallet set
- A public "verified by x402Books" badge for agents that declare wallets

**What Gitlawb provides us:**
- Solves the wallet verification problem cleanly
- Makes the Agent Financial Registry defensible
- Creates structured, machine-readable inputs for Luca

**Proposed integration:**
A lightweight `.x402books/wallets.json` spec inside a Gitlawb repo where agent teams publicly declare:
- `treasury` wallet
- `revenue` wallet
- `expense` wallet
- `deployer` wallet

Luca ingests that declaration → marks wallet as verified → generates financial profile.

**Pitch:**
> Gitlawb proves who the agent is. x402Books helps prove how the agent moves money.

**DM copy:**
> Gitlawb is building verifiable identity and provenance for agents. x402Books wants to do the same for agent finance. A natural collaboration is wallet declaration + verification: signed or repo-declared wallets linked to agent identity, so Luca can track verified treasury, revenue, and payment wallets in the Agent Financial Registry.

**Phase 1.5 deliverables:**
- Proposed `.x402books/wallets.json` schema
- Verified vs candidate wallet framework in the registry
- Repo-linked wallet proof workflow
- Public "verify your agent wallet" CTA

---

### 3. Primer Systems — Native x402 monetization rail (best for revenue)

**Why:**
Right now Luca gives away intelligence for free. Primer's x402 payment stack lets agents pay per scan, per audit, per registry check. This turns x402Books from a research layer into paid per-use infrastructure.

**What we can offer:**
- Premium x402-native accounting endpoints
- Paid wallet audits, agent financial state, registry checks

**What Primer provides us:**
- Agent-safe payment flows
- MultiClaw discovery and usage
- A clean path to productize Luca as a billable service

**Proposed endpoints:**
- `POST /wallet-audit` — pay Luca to scan a wallet
- `GET /agent-financial-state` — pay Luca for a snapshot
- `GET /registry-check` — pay Luca to verify a registry candidate
- `POST /classify-transactions` — pay Luca to categorize a tx set

**Pitch:**
> Luca should be payable. Primer makes that possible natively with x402.

**DM copy:**
> x402Books is a premium x402-native accounting endpoint. Agents should be able to pay Luca directly for wallet scans, audits, and treasury intelligence. We'd love to explore packaging our existing audit and registry logic as a self-serve x402 endpoint using Primer's stack.

---

### 4. Virtuals — Tokenized agent treasury layer (phase 2)

**Why it's phase 2:**
Virtuals has the right architecture (tokenized agents, wallets, treasuries, EconomyOS) but is too broad to close a tight partnership right now. Better to have public proof points first.

**When to approach:**
After Luca has:
- A clean registry format
- Verified wallet declarations (from Gitlawb)
- A few strong public audit examples (from Bankr)
- A pay-per-audit endpoint (from Primer)

**Phase 2 deliverables:**
- Virtuals-compatible registry template
- Agent treasury watchlist
- "Top financially active agents" public view
- Paid audits and public dashboards for tokenized agents

**DM copy (for later):**
> Virtuals is creating tokenized agents with their own wallets and treasuries. x402Books can help the ecosystem understand which agents are financially active, how treasury flows behave, and which wallets should be tracked and verified. We'd love to explore a financial reporting layer for tokenized agents once we've published a few strong public examples.

---

## Product Roadmap

### Now (launched)
- [x] Wallet audit flow
- [x] Transaction categorization
- [x] Financial scoring
- [x] Agent Financial Registry with 20+ agents
- [x] Live API with $LUCA token tiers
- [x] Luca AI accountant on Telegram
- [x] Portfolio tracking (Bankr + Virtuals ecosystem tokens)
- [x] CSV/PDF export
- [x] Shareable public report links

### Near term
- [ ] Individual agent profile pages `/registry/[agent]`
- [ ] Leaderboard section on `/registry`
- [ ] Wallet verification workflow (repo-declared wallets)
- [ ] Bankr agent registry expansion
- [ ] Pay-per-audit x402 endpoint (Primer integration)
- [ ] Sharper landing page positioning copy

### Phase 2
- [ ] Virtuals ecosystem coverage
- [ ] Automated registry ingestion (no manual curation)
- [ ] Agent treasury watchlist / alerts
- [ ] Wallet declaration standard (`.x402books/wallets.json`)
- [ ] "Top financially active agents" public dashboard
- [ ] Multi-ecosystem support beyond Base

---

## Positioning

**x402Books is in early production with real utility.**  
**Luca is transitioning from research copilot to ecosystem-grade financial intelligence layer.**

One-line by partner surface:
- For Bankr agents: *Financial intelligence for self-funding agents*
- For Gitlawb repos: *Verified wallet identity for the agent economy*
- For Primer endpoints: *Treasury transparency as a paid x402 service*
- For Virtuals ecosystem: *Treasury transparency for tokenized agents*

---

## Competitive Landscape (Luca's Research)

**Summary: The exact niche is still open.**

x402Books' niche is not just "crypto accounting." It is the combination of:
- AI-agent financial intelligence
- Public wallet audits
- Agent Financial Registry
- Verification of agent wallets and roles
- Operator-facing explanations of revenue, spend, net flow, anomalies, treasury health
- Base / x402 / agent economy focus

That combination is still differentiated. No direct same-niche competitor found with strong evidence.

---

### Adjacent Competitors

**Cryptio**
Enterprise digital asset accounting / ERP. Heavy institutional positioning — data transformation, reconciliation, compliance, loan management. Strong in enterprise back office, weak overlap with the agent registry and public audit wedge.

**TRES Finance** (acquired by Fireblocks)
Crypto accounting and Web3 treasury. AI Connect is moving toward AI-assisted finance operations. More finance ops software than a financial layer for the agent economy. Important adjacent player on treasury/compliance infra.

**Octav**
Portfolio intelligence, NAV reporting, exposure monitoring, AI-powered transaction labeling. Positioned at funds and portfolio visibility — not agent accounting. Adjacent, not the same wedge.

**Dune (Audit & Tax layer)**
Normalized onchain data for reconciliation, audit, and tax teams. Infrastructure competitor / dependency risk today, but moving closer to accounting workflows. Not a direct product competitor yet, but a watch item.

**Surf**
"Crypto intelligence for AI agents." Agent-native distribution, low-friction skill install. Not an accounting competitor but signals that agent-native crypto tooling is becoming real. Important packaging insight: one skill, many endpoints, immediate use.

**Mensari**
X-indexed references exist but main domain appears inactive. Weak competitive signal — more evidence the space is still early and fragmented.

---

### Strategic Analysis

Most others are optimized for:
- Enterprise accounting teams
- Treasury / NAV / reconciliation
- Generic crypto data
- Institutional reporting

x402Books can own:
- Agent wallet identity
- Agent wallet verification
- Financial profiles for agents
- Public agent registry
- Operator-facing agent audits
- "Are agents actually working?"
- Base-native agent economy coverage

---

### Key Product Insights from Competitors

| Player | Insight |
|--------|---------|
| Dune | Turning raw onchain data into source-traceable accounting records — good for auditability |
| TRES | AI-native finance workflow — finance teams want AI in the loop, not just exports |
| Octav | AI transaction review + fast exposure clarity |
| Surf | Agent-native packaging: install one skill and your agent can use it immediately |

The Surf insight is especially relevant for Luca: how we package and distribute matters as much as what we build.

---

### The Big Opportunity

> **Others explain wallets. x402Books explains agents as economic actors.**

Instead of: "here is a wallet dashboard"

We say:
- "Here is the public financial profile of an agent"
- "Here is whether this agent is economically active"
- "Here is its treasury health"
- "Here is what wallets are verified vs candidate"
- "Here is what the financial data says about this agent's viability"

That is a category, not a feature.

---

### 4 Surfaces to Push Hard

1. **Agent Financial Registry** — public directory with claim/verify flow
2. **Luca Audit Notes** — short public-safe financial breakdowns posted regularly
3. **Verification Layer** — Verified / Candidate / Needs Review status per agent
4. **Ecosystem Financial Leaderboards** — most active agents, newest verified, treasury watch

---

### Biggest Strategic Risk

Not a copycat today. The real risk is that enterprise accounting players (Cryptio, TRES, Dune) move downmarket once the agent economy category becomes obvious.

**Right move:**
- Define the category fast
- Publish aggressively
- Onboard agents quickly
- Make verification a status game
- Become the default public financial layer before others notice the wedge
