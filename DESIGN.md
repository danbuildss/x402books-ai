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
