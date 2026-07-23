---
version: "1.0"
name: Zetta — Terminal Ledger Design System
description: >
  Dark-first financial infrastructure design system. Data-dense, institutional,
  monospaced where precision matters. Bloomberg-like credibility without clutter.
  The primary experience is dark mode. Every surface renders financial data as
  the primary content.
---

# Zetta Design System — Terminal Ledger

## 1. Visual Direction

**Character:** Industrial / Utilitarian / Institutional

Zetta is financial infrastructure. The UI should feel like a Bloomberg terminal
or a bank's internal reporting system — not a consumer app, not generic Web3 SaaS.
Data is the hero. Chrome is minimized. Trust is earned through density and precision.

**Primary principles:**
- Financial metrics appear before scores, labels, or decorative content
- Agent bio appears immediately below agent name (never buried)
- Luca verdict comes after the main financial metrics
- Verification and data quality must be obvious at a glance
- Missing data must never look like zero — use `—` em-dash, never `$0.00`
- Dark mode is the primary experience; light mode is not supported
- Mobile must remain readable — data-dense does not mean unreadable on 375px

**Anti-patterns — never do these:**
- Pill buttons (border-radius: 99px) — too consumer, too friendly
- Hero sections on data pages — /dashboard, /registry, /agent/:slug must open on data
- $0.00 to represent missing/unknown values — this is factually wrong
- Agent profiles without a bio paragraph
- Decorative glows or gradients on data tables
- Cards with heavy shadows or elevated chrome
- Emojis as section markers or status indicators
- Numbered step markers (01/02/03) on content that is not actually sequential

---

## 2. Typography System

**Font pairing:**

| Role | Face | Weight | Style |
|------|------|--------|-------|
| Display / Headline | JetBrains Mono | 700–800 | Monospaced; used for page titles, metric values, agent names |
| Data / Labels | JetBrains Mono | 400–600 | All financial figures, addresses, table values |
| Body / UI | DM Sans | 400–500 | Descriptions, notes, navigation, form labels |
| Eyebrow / Tag | DM Sans | 700–800 | Uppercase section labels, badges, status |

**Loading (add to layout.tsx `<head>`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
```

**CSS tokens:**
```css
--font-mono: "JetBrains Mono", ui-monospace, monospace;
--font-sans: "DM Sans", system-ui, sans-serif;
```

**Type scale:**

| Token | Value | Use |
|-------|-------|-----|
| `--text-display` | 2.4rem / 700 / mono | Page H1, agent name (large) |
| `--text-title` | 1.6rem / 700 / mono | Section headers, card eyebrows |
| `--text-metric` | 1.8rem / 700 / mono | MetricCard values |
| `--text-metric-lg` | 2.8rem / 800 / mono | Hero metric, treasury total |
| `--text-body` | 0.875rem / 400 / sans | Body copy, descriptions |
| `--text-body-sm` | 0.8rem / 400 / sans | Secondary body, notes |
| `--text-data` | 0.82rem / 500 / mono | Table values, addresses, tx hashes |
| `--text-eyebrow` | 0.6rem / 800 / sans | Uppercase eyebrow labels (letter-spacing: 0.1em) |
| `--text-label` | 0.75rem / 500 / sans | Form labels, row labels in LedgerRow |
| `--text-badge` | 0.62rem / 600 / sans | StatusBadge text |

---

## 3. Spacing & Grid

**Base unit:** 4px

**Space tokens:**
```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
```

**Page layout:**
```css
--page-max: 1200px;
--page-pad: 40px;      /* desktop */
--page-pad-sm: 16px;   /* mobile */
--section-gap: 48px;   /* vertical gap between major sections */
```

**Border radius:**
```css
--radius-sm:   3px;   /* badges, tags, chips */
--radius-md:   6px;   /* buttons, inputs */
--radius-card: 8px;   /* LedgerCard, MetricCard */
```

**Component density:**
- LedgerRow padding: 10px 0 (desktop), 12px 0 (mobile — more thumb room)
- MetricCard padding: 20px 24px
- LedgerCard header padding: 16px 20px
- Section separation: 48px minimum between LedgerCard groups

---

## 4. Color & Status System

**Foundation palette (TL-A):**
```css
/* Backgrounds */
--bg:           #0A0C10;   /* page background */
--surface:      #111418;   /* card background */
--surface-soft: #181C24;   /* nested, subtle section */
--surface-hover: rgba(255,255,255,0.025); /* hover state */

/* Text */
--ink:          #D0D4E0;   /* primary text */
--ink-mid:      #8B96A8;   /* secondary text, less-important labels */
--muted:        #505870;   /* tertiary, disabled, placeholder */

/* Borders */
--line:         #21262F;   /* dividers, borders */

/* Semantic accents */
--accent:       #4AE8A0;   /* green — positive, confirmed, live */
--red:          #F46060;   /* error, negative, risk */
--amber:        #F4B942;   /* warning, estimated, in-progress */
--blue:         #5B9EF4;   /* informational, neutral, coverage */
--purple:       #8B7CF6;   /* AEON ecosystem, special */

/* Semantic aliases */
--positive:     var(--accent);   /* financial gain, verified, up */
--negative:     var(--red);      /* financial loss, failed, down */
```

**StatusBadge variants:**

| Variant | Color | Use |
|---------|-------|-----|
| `green` | #4AE8A0 | Verified, live, confirmed, manifest declared |
| `amber` | #F4B942 | Warning, estimated, pending, in-progress |
| `red` | #F46060 | Error, failed, at-risk, over budget |
| `blue` | #5B9EF4 | Informational, neutral activity |
| `neutral` | #505870 | Pending, inactive, not started |
| `verified` | #4AE8A0 + checkmark | Identity verified |
| `luca-managed` | #8B7CF6 | Luca is managing this agent |
| `actual` | #4AE8A0 | Real on-chain data, not estimated |
| `estimated` | #F4B942 | Inferred/approximated figure |
| `missing` | #F46060 | Data not available — use instead of $0.00 |

**Color semantics rules:**
- `--accent` is for positive financial signals AND primary CTAs — not decorative
- `--amber` means "needs attention" not "secondary" — do not use as a second brand color
- `--red` is reserved for actual problems: losses, errors, missing critical data
- Never use `--blue` for CTAs — it reads as informational, not actionable

---

## 5. Component Hierarchy

**Agent profile page ordering (top to bottom):**
1. Agent name (display mono, large)
2. Agent bio / description paragraph (body sans, immediately after name)
3. Ecosystem + verification badges
4. MetricGrid (4 cols: revenue, expenses, net, treasury)
5. Luca verdict panel (if available)
6. LedgerCards for detail: settlements, wallets, expense breakdown
7. Related agents or registry link

**Rule:** Data before verdicts. Identity before data. Bio before badges.

**MetricGrid:**
- Always 4 columns on desktop
- Always 2×2 on mobile (never 1-column stacked)
- Values in mono font
- Sub-labels in sans, muted color
- valueColor overrides: green for positive, red for negative, default for neutral

**LedgerCard:**
- eyebrow: uppercase sans, 0.6rem, muted color, letter-spacing 0.1em
- title: optional, body-weight, below eyebrow
- action: optional Link/button in top-right corner
- Children: LedgerRow components only (no arbitrary children)

**LedgerRow:**
- label: left side — can be JSX (name + badges inline)
- value: right side — financial figure or status text
- detail: below value — secondary metric, progress bar, change delta
- badge: far right of label row — StatusBadge only
- first/last props control top/bottom border-radius on the containing card
- Missing values: render `—` (em-dash) not `$0.00`, not `null`, not `undefined`

**Verdict panel (Luca output):**
```
┌─────────────────────────────────────────┐
│ LUCA VERDICT                            │
│ [amber/green/red badge]                 │
│                                         │
│ "Paragraph verdict text from Luca."     │
│                                         │
│ Generated: [timestamp]                  │
└─────────────────────────────────────────┘
```
- Background: `--surface-soft`
- Left border: 3px solid `--accent` (or `--red` if negative)
- Never a standalone page section — always inside a LedgerCard

---

## 6. Table & Ledger Patterns

**LedgerCard / LedgerRow — the primary data pattern:**

```tsx
<LedgerCard eyebrow="Section Label" title="Optional Title" action={<Link>View all →</Link>}>
  <LedgerRow
    first
    label="Row label or JSX"
    value="$12,450"
    valueStyle={{ color: "var(--accent)" }}
    detail={<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>+12% this week</span>}
    badge={<StatusBadge variant="green">Live</StatusBadge>}
  />
  <LedgerRow
    last
    label="Missing data row"
    value="—"
    badge={<StatusBadge variant="missing">No data</StatusBadge>}
  />
</LedgerCard>
```

**Registry list pattern:**
- Each agent row: name + ecosystem badge + wallet count chip → value (revenue) → badge (verified/pending)
- Clickable rows link to `/registry/[slug]`
- Sorting controls above the LedgerCard (not inside)
- Empty state: "No agents indexed yet." — never show empty rows or skeleton rows that look like data

**Missing data rules:**
| Situation | Display |
|-----------|---------|
| Value not yet available | `—` (em-dash) |
| Value is genuinely zero | `$0.00` |
| Wallet not declared | `—` + `<StatusBadge variant="missing">Not declared</StatusBadge>` |
| Data estimated | actual figure + `<StatusBadge variant="estimated">Est.</StatusBadge>` |
| Data confirmed on-chain | actual figure + `<StatusBadge variant="actual">Actual</StatusBadge>` |

---

## 7. Mobile Rules

**Breakpoints:**
```css
--bp-sm: 640px;   /* small phones */
--bp-md: 768px;   /* tablets / large phones */
--bp-lg: 1024px;  /* small laptops */
--bp-xl: 1200px;  /* desktop */
```

**MetricGrid on mobile:**
- 4-col → 2×2 grid at `< 768px`
- Never 1-column stack (loses the comparative value of seeing 4 metrics together)
- Font size reduces: metric value `1.4rem`, sub-label `0.7rem`

**LedgerRow on mobile:**
- `detail` prop: hidden at `< 640px` (secondary metric, progress bar)
- `badge` prop: moves below value at `< 480px`
- Padding increases to 12px 0 for thumb targets

**Navigation on mobile:**
- Header collapses to hamburger at `< 768px`
- No horizontal scroll on any page body
- Page padding reduces to `--page-pad-sm: 16px`

**Touch targets:**
- Minimum 44px height for all interactive elements
- Buttons: `min-height: 44px`, `min-width: 44px`
- LedgerRow links: full-row tap target at mobile widths

---

## 8. Page-by-Page Information Hierarchy

### /registry (list)
1. Page eyebrow + title ("Agent Registry")
2. MetricGrid: total agents, verified agents, total wallets, ecosystems
3. Search/filter controls
4. LedgerCard: agent rows (name, ecosystem, wallets, revenue, badge)
5. Pagination

### /registry/[slug] (agent profile)
1. Agent name (display mono)
2. Agent bio paragraph (immediately below name — never skip)
3. Ecosystem + verification badges
4. MetricGrid: revenue 30d, expenses 30d, net income, treasury
5. Luca verdict panel
6. LedgerCard: settlement history
7. LedgerCard: declared wallets + roles
8. LedgerCard: expense breakdown

### /leaderboard
1. Page title + time period selector
2. MetricGrid: network totals
3. LedgerCard: ranked agent rows (rank, name, revenue, change delta, badge)

### /luca (Luca ledger / chat)
1. Luca identity header (name, badge, description — not a hero, just identity)
2. Active report or verdict panel
3. Chat/query interface
4. Recent queries as LedgerCard rows

### /surplus/[slug] (agent surplus report)
1. Agent name + bio
2. MetricGrid: inference spend, request count, avg cost, budget remaining
3. Luca verdict on inference health
4. LedgerCard: inference event log
5. LedgerCard: cost breakdown by provider

### /dashboard
1. No hero — open on data immediately
2. MetricGrid: portfolio metrics
3. LedgerCard: agents under management
4. LedgerCard: recent activity

### /dashboard/treasury
1. Treasury total (large mono metric, top of page)
2. MetricGrid: breakdown by wallet role
3. LedgerCard: wallet list with balances
4. LedgerCard: movement history

### /register
1. Title + brief description (2 sentences max)
2. 3-step progress indicator (only if actually a multi-step form)
3. Form fields in LedgerCard containers
4. Submit CTA

### /research
1. Page title + description
2. Recent reports as LedgerCard rows (title, date, type badge)
3. No decorative hero

### /admin (internal)
1. MetricGrid: system health metrics
2. LedgerCards: pending actions, flagged agents, attribution issues

---

## 9. What to Remove

**Immediately:**
- Old DESIGN.md content (this file replaces it — done)
- Pill buttons with `border-radius: 99px` — replace with `--radius-md: 6px`
- `border-radius: 10px` on LedgerCard — use `--radius-card: 8px`
- Missing bio sections on agent profile pages — add placeholder or enforce in registry
- `$0.00` rendered for missing/unknown data — replace with `—`
- Hero sections on `/dashboard`, `/registry`, `/registry/[slug]` — these are data pages
- Emoji section markers (⚡, 🔥, etc.) in production page content
- `letter-spacing: 0.1em` on non-eyebrow body copy — only eyebrows get this treatment
- Numbered step markers (01/02/03) on any content that is not a literal ordered process

**Defer (Phase 4+):**
- Any remaining `system-ui` body font — replace with DM Sans after fonts are wired
- Any remaining `ui-monospace` display text — replace with JetBrains Mono after fonts
- Light-mode-specific styles — Zetta is dark-only; remove `@media (prefers-color-scheme: light)` blocks

---

## 10. Rollout Order

### Phase 1 — Foundation tokens (globals.css + layout.tsx)
- Add JetBrains Mono + DM Sans to `layout.tsx`
- Update `globals.css`:
  - `--font-mono`, `--font-sans` with new face names
  - Add `--ink-mid`, `--surface-hover`
  - Add `--radius-sm`, `--radius-md`, `--radius-card`
  - Add `--space-*` tokens
  - Add `--positive`, `--negative` aliases

### Phase 2 — Component library
- LedgerCard: `border-radius: var(--radius-card)`
- LedgerRow: tighten padding to match spec
- StatusBadge: `border-radius: var(--radius-sm)`
- MetricCard: metric value to `font-family: var(--font-mono)`
- Buttons: `border-radius: var(--radius-md)`, remove pill styles

### Phase 3 — High-traffic data pages
- `/registry` list page
- `/registry/[slug]` agent profile
- `/leaderboard`

### Phase 4 — Intelligence pages
- `/luca`
- `/surplus/[slug]`
- `/research`

### Phase 5 — Dashboard suite
- `/dashboard` and all `/dashboard/*` sub-pages

### Phase 6 — Docs and landing
- `/docs/*`
- `/how-it-works`
- `/adopt`
- `/` (home)

---

## Product Architecture & Density Doctrine

*Recorded from agent decisions — 2026-07-23*

### Three-layer architecture

The Zetta product has three distinct surfaces, each with a different audience, job, and density.

| Layer | Surface | Audience | Job |
|-------|---------|----------|-----|
| 1 | Landing page (`/`) | New visitors, founders, partners, researchers, agent teams | Explain the system. Build trust. Route people. |
| 2 | Public subpages | Anyone evaluating Zetta, developers, ecosystem participants | Demonstrate the system. Live data. Proof of activity. |
| 3 | Operator dashboard (`/dashboard`) | Operators, treasury owners, agent teams with active agents | Operate the system. Monitor. Manage. Review. |

**One system, three densities.** The same terminal grammar applies across all three. What changes is compression and hierarchy — not the visual language.

### Framing sentence

> The homepage explains the system. The public pages demonstrate the system. The dashboard operates the system.

### Density levels

**Landing density (lowest)**
- Sharp, credible, product-first
- Terminal-influenced but readable for first-time visitors
- Selective live panels showing the system working
- Key metrics, short Luca notes, routing CTAs
- Goal: "I understand what Zetta is. This is real. I know where to go next."

**Public product density (medium-high)**
- Table and panel driven
- Live data, searchable lists, reports
- Closer to Zetta Terminal feel
- Subpages: Registry, Research, Luca, Leaderboard, API, Docs, Methodology
- These pages are the product shell — not extras

**Operator dashboard density (highest)**
- Most compressed, workflow-first, least marketing
- Management views: my agents, my wallets, manifest status, attribution review, reports, alerts, treasury/spend/revenue, Luca notes, API keys
- Built for daily use by people who already understand the product

### Terminal direction

The terminal aesthetic is about credibility and function, not decoration.

**Use:**
- Dark charcoal / near-black base
- Muted gray panels
- Off-white data text
- Green for positive net flow / verified / healthy
- Amber/orange for warnings, active tabs, labels
- Red for anomalies / negative flow / critical
- Blue sparingly for links or neutral info
- Uppercase section labels (AGENT GDP, ATTRIBUTION STATUS, LUCA VERDICT)
- Monospaced numbers throughout
- Condensed, tightly spaced headers
- Dense panel layouts — think panes, not sections

**Never use:**
- Neon cyberpunk / scanlines / glowing code rain
- Fake console prompts as decoration
- Soft rainbow gradients
- Oversized cards with excess whitespace
- Generic SaaS hero + feature card + footer marketing stack

Bloomberg works because it feels expensive, compressed, and authoritative. Zetta should feel like a modern onchain financial terminal — not a hacker toy.

### Luca placement

Luca is not a page-hero or mascot. Luca is an analyst pane embedded in the terminal.

Correct treatment:
- Live "Luca Note" panel inline beside real numbers
- Short verdicts with confidence labels
- Source-backed observations
- Treasury warnings and anomaly flags inline

Examples of correct Luca voice in panels:
- `Luca Note: Revenue visible. Attribution still thin.`
- `Treasury Watch: Activity concentrated in top 1 agent.`
- `Registry Alert: 12 manifests submitted. 6 agents attributed.`

### Homepage command center structure

Replace the current hero/sections/footer stack with a command center layout:

- **Top bar**: Zetta wordmark, ecosystem filter, search, last updated, Open App, Registry, Docs
- **Main center**: Agent GDP, Net income, Total expenses, Attributed revenue, Coverage %, active ecosystem
- **Right panel**: Luca Verdict, latest registry alert, manifest status, newest research brief
- **Bottom strip**: Top revenue agents, newly attributed agents, verification queue, latest financial events

---

## Site Map & Page UX Structure

*Recorded from agent decisions — 2026-07-23*

### A. Public marketing / narrative layer

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/about` | Company / mission / why agent finance matters |
| `/methodology` | Attribution logic, confidence system, definitions |
| `/contact` | Contact / partner / enterprise / support |
| `/access` | Sign in / request access |
| `/adopt` | Why teams should adopt Zetta — manifests, reporting, API |

### B. Public product layer

| Route | Purpose |
|-------|---------|
| `/registry` | Agent Financial Registry index |
| `/registry/[agent-slug]` | Individual agent profile |
| `/leaderboard` | Rankings and performance views |
| `/research` | Research archive |
| `/research/[report-slug]` | Individual report page |
| `/luca` | Luca overview / interface / product entry |
| `/api` | API product page / endpoint overview / key use cases |
| `/docs` | Docs entry |
| `/validate` | Manifest validator |
| `/submit-agent` | Submit or claim agent (long-term: own page, short-term: `/registry#verify`) |
| `/manifest-guide` | How to declare wallets / schema / examples |

### C. Authenticated operator layer

| Route | Purpose |
|-------|---------|
| `/dashboard` | Operator overview |
| `/dashboard/agents` | My agents |
| `/dashboard/agents/[agent-slug]` | Operator agent workspace |
| `/dashboard/wallets` | Wallet management — declared / candidate / inferred |
| `/dashboard/books` | Books overview |
| `/dashboard/reports` | Generated reports / exports / close summaries |
| `/dashboard/luca` | Luca operator workspace |
| `/dashboard/alerts` | Anomalies / treasury warnings / attribution issues |
| `/dashboard/manifests` | Manifest submissions / validation / version history |
| `/dashboard/verification` | Claim status / signature verification / evidence review |
| `/dashboard/api` | API keys / usage / scopes |
| `/dashboard/settings` | Workspace / team / billing / notification settings |

### D. Secondary support pages

`/privacy` · `/terms` · `/security` · `/status` · `/changelog`

---

### Page UX: Homepage `/`

**Purpose:** Explain Zetta fast, prove it is real, route users into the right product surface.

**Primary audience:** First-time visitors, founders, operators, partners, agent teams, ecosystem researchers.

**Top nav:** Zetta · Registry · Research · Leaderboard · Luca · Docs · Open App · Sign In

**Hero / command center** — not a generic hero; narrative + live market board hybrid:
- Left: headline, subheadline, primary CTA (Explore Registry), secondary CTA (Open App / View Research)
- Right: live metrics panel (indexed agents, attributed agents, coverage, agent GDP, expenses, net income, last updated, ecosystem tags)

**Proof strip:** Top revenue agents · newest attributed agent · manifest submissions · Luca note · latest report

**"How it works":** Attribution → Books → History → Intelligence → Verification → API

**Product routing grid:** Registry · Leaderboard · Luca · Research · API · Docs — each card answers: what it is, why it matters, who it is for

**Trust / doctrine section:** declared vs discovered vs inferred · verified vs candidate · books over hype · accuracy over breadth

**Final CTA:** Submit Agent · Explore Registry · Open App

---

### Page UX: Registry `/registry`

**Purpose:** Public source of truth for tracked agents.

**Header:** agents tracked · wallets declared · verified agents · attributed agents

**Filters:** ecosystem · attribution status · verification level · has manifest · revenue active

**Sortable table:** name · ecosystem · wallet status · financial activity · treasury health · last updated

**Right rail / top strip:** newest declarations · newly reviewed agents · Luca registry notes

**User goal:** Find, compare, and audit public agent profiles fast.

---

### Page UX: Agent Profile `/registry/[agent-slug]`

**Purpose:** Single public financial profile for one agent.

**Header:** agent name · ecosystem · website · X handle · status badges · last updated · claim/verify CTA if applicable

**Summary row:** wallets tracked · declared wallets · attribution confidence · treasury health · financial activity score · revenue / expenses / net flow

**Tabs / panel sections:** Overview · Wallets · Books · Verification · Research / notes · History

**Wallets section:** address · role · chain · confidence · evidence source · declared / discovered / inferred label

**Books section:** revenue · expenses · treasury · net income · chart over time · caveat text when incomplete

**Luca pane:** verdict · confidence · anomalies or gaps · "good signal / weak attribution" style notes

**Verification section:** current state · manifest present? · signed proof? · evidence notes · what remains unresolved

---

### Page UX: Leaderboard `/leaderboard`

**Purpose:** Public rankings and market structure surface.

**Ranking type tabs:** Revenue · Net income · Treasury · Growth · Newly attributed · Most active

**Filters:** ecosystem · timeframe · attribution quality

**Dense table:** rank · agent · revenue · expenses · net · trend · attribution confidence

**Side insight panel:** concentration notes · top movers · Luca market notes

**User goal:** See who matters financially, not socially.

---

### Page UX: Research Index `/research`

**Purpose:** Archive of analyst-grade financial intelligence.

**Structure:** featured report · categories (weekly reports / treasury observations / registry scans / methodology notes / ecosystem analysis) · filters (ecosystem / date / report type) · report list with title, date, one-line verdict, key metric

**User goal:** Read the books of the ecosystem, not just browse news.

---

### Page UX: Report Page `/research/[report-slug]`

**Structure:** title · date · report type · summary verdict · key metrics row · core findings · concentration / attribution / anomaly sections · linked agents · methodology note · CTA to registry / Luca / API

**Optional right rail:** key figures · related agents · related reports

---

### Page UX: Luca `/luca`

**Purpose:** Explain and expose Luca as the analyst surface.

**Top section:** what Luca is · what Luca does · short example prompts (audit this wallet / summarize agent books / show treasury anomalies / compare agent revenue)

**Product sections:** wallet audits · reports · anomaly review · monthly close · registry intelligence · operator notes

**Output examples:** short audit · treasury warning · registry note · weekly finance summary

**CTA:** Open Luca in app · Try demo query · View methodology

**Important:** This page should feel like analyst interface, not chatbot marketing.

---

### Page UX: API `/api`

**Purpose:** Sell developer and operator value.

**Headline:** Machine-readable books for the agent economy.

**Use cases:** pull registry data · query agent books · power internal dashboards · generate audits

**Endpoint categories:** registry · books · reports · truth / verification

**CTA:** Get API access · Read docs

**Important:** Less dev-tool fluff, more financial data utility.

---

### Page UX: Docs `/docs`

**Structure:** quickstart · manifest schema · verification flow · API references · examples · tutorials · glossary

**Rule:** Clean and readable, not overloaded with marketing language.

---

### Page UX: Validate `/validate`

**Structure:** paste manifest / upload file / repo path · validate schema · show errors / warnings · show inferred wallet roles if possible · CTA to submit verified declaration

**Goal:** Turn curiosity into structured attribution.

---

### Page UX: Submit Agent `/submit-agent`

**Purpose:** Get new agents into the system.

**Structure:** project name · website · X handle · primary wallet or manifest · evidence source · optional notes · next steps explanation

**Goal:** Low-friction intake, not giant form fatigue.

---

### Page UX: Dashboard `/dashboard`

**Purpose:** Working surface for real users.

**Top command bar:** workspace · search · alerts · last sync · quick actions

**Core tiles:** attributed revenue · expenses · treasury · net position · wallets requiring review · anomalies · unresolved verification items

**Main panels:** my agents · recent wallet activity · Luca notes · manifest status · latest reports · alerts queue

**Feel:** terminal / home screen.

---

### Page UX: My Agents `/dashboard/agents`

**Structure:** list/table of managed agents · status chips · revenue / treasury / verification summary · quick actions (open workspace / review wallets / run Luca report / upload manifest)

---

### Page UX: Agent Workspace `/dashboard/agents/[agent-slug]`

**Purpose:** The real operating center for one agent.

**Tabs:** Overview · Wallets · Books · Reports · Luca · Verification · Settings

- **Overview:** financial snapshot · current health · recent changes · unresolved issues
- **Wallets:** declared / candidate / inferred · role editing / notes / evidence
- **Books:** categorized inflows/outflows · period selector · revenue / expense / net · export
- **Reports:** weekly / monthly / anomaly / custom export
- **Luca:** ask Luca · saved prompts · analyst notes · generated summaries
- **Verification:** manifests · signatures · evidence review · status history

---

### Page UX: Wallets `/dashboard/wallets`

**Purpose:** Wallet operations layer.

**Structure:** table of wallets · linked agents · roles · confidence · verification state · activity flags

**Filters:** undeclared · candidate · stale · anomalous · high-activity

---

### Page UX: Books `/dashboard/books`

**Structure:** period selector · entity filter · categorized totals · ledger/table · exports · caveat / confidence labels · reconciliation warnings

---

### Page UX: Reports `/dashboard/reports`

**Structure:** scheduled reports · recent reports · create report

**Templates:** weekly summary · monthly close · anomaly report · treasury health report

---

### Page UX: Alerts `/dashboard/alerts`

**Purpose:** Exception management — the most important operational page.

**Structure:** severity filters · anomaly list · treasury warnings · wallet issues · manifest failures · unresolved attribution gaps

**Rule:** Financial software becomes useful when it shows what needs attention now.

---

### Page UX: Manifests `/dashboard/manifests`

**Structure:** submitted manifests · validation status · last sync · version history · errors / warnings · resubmit / approve flow

---

### Page UX: Verification `/dashboard/verification`

**Structure:** claims pending review · verified wallets · candidate wallets · signature-based submissions · evidence links · confidence transitions

---

### Page UX: API Dashboard `/dashboard/api`

**Structure:** API keys · scopes · usage · rate limits · recent calls · key rotation

---

## UI Doctrine: Landing vs Product vs Dashboard

*Recorded from agent decisions — 2026-07-23*

**Core doctrine: One system. Three densities.**

### A. Landing page doctrine

**Job:** Sell belief, frame the category, route users.

**Feel:** sharp · premium · credible · slightly terminal-influenced · not crowded · not generic SaaS

**Rules:**
- Fewer panels, stronger narrative hierarchy
- Only highest-signal metrics
- Short copy
- Product routing is essential — every section must answer "why should I care?"

**Density:** Low to medium

**Avoid:** Clutter · giant essay sections · too many tables · too many control surfaces · fake hacker visuals

---

### B. Public product doctrine

**Job:** Prove the system works.

**Includes:** Registry · Research · Leaderboard · Luca · API · Methodology · Docs · Validation / submission flows

**Rules:**
- The data is the interface
- Panels should feel queryable and structured
- Tables are good
- Confidence and attribution labels must always be visible
- Luca outputs must sit next to evidence, not float alone
- Public pages should feel inspectable

**Density:** Medium to high

**Design language:** tighter grids · chips / tags / status labels · condensed metric rows · analyst sidebars · more mono numerics · visible "last updated" and timeframe language

**Avoid:** Hiding the methodology · overexplaining obvious financial concepts · social-feed style product pages · decorative emptiness

---

### C. Operator dashboard doctrine

**Job:** Operate the books.

**Feel:** terminal-grade · dense · fast · serious · workflow-first · minimal marketing

**Rules:** Every screen must support action. The system must constantly answer:
- What changed?
- What is unresolved?
- What needs review?
- Where is the money?
- How confident are we?

**Density:** High

**Design language:** multi-panel layouts · compact nav · financial command center · keyboard-friendly · persistent filters · live status bars · anomaly and confidence color language · compressed but readable typography

**Avoid:** Oversized UI · soft landing-page cards · excessive whitespace · hidden important states · "assistant-first" layout that buries the books

---

### Shared visual doctrine (all three layers)

**Typography:** sharp headers · mono/semi-mono numerics · uppercase labels · strong hierarchy

**Color semantics:**
- Dark neutral base
- Amber = active / warning / selected
- Green = healthy / positive / verified
- Red = risk / anomaly / negative
- Blue = informational only, used sparingly

**Labels — always expose:** timeframe · confidence · attribution state · verification state · last updated

**Language — use financial terms, not startup filler:**

| Use | Not |
|-----|-----|
| Revenue, Expense, Treasury, Net Income | Engagement, momentum |
| Attributed, Verified, Candidate | Community buzz |
| Manifest, Evidence, Luca Verdict | AI magic wording |
| Treasury Watch, Registry Alert | Ecosystem energy |

---

### Execution order

| Phase | Scope |
|-------|-------|
| 1 | Homepage refactor · nav cleanup · routing clarity · visual doctrine lock |
| 2 | Registry + agent page + leaderboard unified UI · research cleanup · Luca repositioned as analyst surface |
| 3 | Operator dashboard system · manifests / verification / alerts / books workflows |
| 4 | API + docs polish · keyboard shortcuts · saved views · terminal-grade operator tooling |

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| JetBrains Mono for display | Bloomberg-like authority; legible at display sizes; distinguishes Zetta from generic sans-serif SaaS |
| DM Sans for body | Clean, geometric, professional; pairs well with mono without fighting it |
| Dark-only | Zetta is financial infrastructure used by operators who prefer dark interfaces; light mode adds maintenance cost for no user benefit at this stage |
| 8px card radius | Institutional feel; less "friendly app", more "terminal"; sharper than typical 12–16px SaaS cards |
| 3px badge radius | Near-square chips read as data labels, not marketing pills |
| Bio immediately below name | Highest-frequency information gap in the current registry; agents without bios look half-finished |
| Em-dash for missing data | Financial reporting convention; `$0.00` implies the value was measured and was zero, which is wrong |
| MetricGrid 2×2 on mobile | Comparative value of seeing 4 metrics is lost if they stack single-column; 2×2 preserves the relationship |
| Verdict after MetricGrid | User needs the raw numbers to evaluate the verdict; verdict without data context is an assertion without evidence |
