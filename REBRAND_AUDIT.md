# Rebrand Audit: x402Books → Zetta

**Status:** Pre-rebrand audit. Do not begin execution until trust and attribution work (Phases 1–3) is complete.
**Date:** June 18, 2026
**Scope:** Every reference to "x402Books", "x402books", and related brand identifiers across the codebase, infrastructure, and external channels.

---

## 1. Codebase References

### 1.1 Hardcoded URLs and Domain

| File | Line(s) | Content | Action Required |
|------|---------|---------|-----------------|
| `src/app/api/cron/daily-report/route.ts` | Line 9 | `const APP_URL = "https://x402books.xyz"` | Replace with Zetta domain |
| `src/app/page.tsx` | Multiple | `lp-eyebrow` text: "x402Books · Financial Identity..." | Update brand name |
| `src/app/page.tsx` | Section header | "How x402Books Works" | Rename to Zetta |
| `src/app/page.tsx` | Registry section | "x402Books identifies which wallets..." | Update brand name |
| `src/app/page.tsx` | Body copy | Multiple "x402Books" mentions in section descriptions | Update all |
| `src/app/layout.tsx` | Metadata | `title: "x402Books AI"`, `og:site_name`, `og:url` pointing to x402books.xyz | Full metadata rebrand |
| `src/app/home-header.tsx` | Social links | `href="https://x.com/x402Books"`, `href="https://t.me/x402books"` | Update handles |
| `src/app/methodology/page.tsx` | Throughout | "x402Books" in content | Update |
| `src/components/site-footer.tsx` | Footer copy | "x402Books" brand references | Update |

### 1.2 Twitter/X Handle References

| File | Content |
|------|---------|
| `src/app/home-header.tsx` | `href="https://x.com/x402Books"` |
| `src/app/page.tsx` | `href="https://x.com/x402Books"` (Follow CTA) |
| `src/app/layout.tsx` | `twitter:site: "@x402Books"`, `twitter:creator: "@x402Books"` |

### 1.3 Telegram References

| File | Content |
|------|---------|
| `src/app/home-header.tsx` | `href="https://t.me/x402books"` |

### 1.4 API Endpoint Domain

All API routes are served from `x402books.xyz`. External callers (Hermes, agent builders) reference:
- `https://x402books.xyz/api/cron/refresh-books`
- `https://x402books.xyz/api/v1/agent-books/[slug]`
- `https://x402books.xyz/api/v1/agent-financial-state`
- `https://x402books.xyz/api/v1/full-report`
- `https://x402books.xyz/api/v1/ledger-summary`

**These cannot be broken without a migration window and advance notice to all callers.**

### 1.5 Documentation References

| Location | Content |
|----------|---------|
| `/developer` page | All references to x402Books in the developer documentation |
| `/methodology` page | Brand references in the methodology explanation |
| `CLAUDE.md` | "x402Books" throughout the north star document |

### 1.6 Manifest Specification

The manifest specification (`.agent/wallets.json`) is chain/protocol agnostic and does not reference the brand name. No manifest changes required for builders on rebrand.

---

## 2. Infrastructure References

### 2.1 Vercel

| Item | Current Value | Action |
|------|--------------|--------|
| Project name | `x402books-ai` (assumed) | Rename in Vercel dashboard |
| Production domain | `x402books.xyz` | Add new Zetta domain, keep x402books.xyz as redirect |
| Environment variables | Named with `X402BOOKS_*` prefix (e.g. `X402BOOKS_INTERNAL_SECRET`) | Rename in Vercel, update code references |

**Environment variables to audit and rename:**
- `X402BOOKS_INTERNAL_SECRET` → referenced in `src/lib/internal-auth.ts`

### 2.2 Supabase

| Item | Current Value | Action |
|------|--------------|--------|
| Project name | Likely `x402books` or similar | Cosmetic only; does not affect functionality |
| Table names | `registry_agents`, `registry_agent_wallets`, etc. | No changes required — table names are internal |

### 2.3 Alchemy

| Item | Current Value | Action |
|------|--------------|--------|
| App name | Likely registered as "x402books" | Rename in Alchemy dashboard |
| API key | Unchanged | No action required |

### 2.4 Telegram Bot

| Item | Action |
|------|--------|
| Bot name/username | Update to reflect Zetta brand if desired |
| Chat IDs | Unchanged |

---

## 3. External Channels

### 3.1 Social Media

| Channel | Handle | Action |
|---------|--------|--------|
| Twitter/X | @x402Books | Transfer to @Zetta or @ZettaBooks or @ZettaAI — check availability first |
| Telegram | t.me/x402books | Rename channel (username change requires Telegram support) |

### 3.2 Domain

| Domain | Action |
|--------|--------|
| `x402books.xyz` | Retain and redirect to Zetta domain for minimum 12 months |
| `x402books.com` | Check if owned; if not, acquire to prevent squatting |
| `zetta.xyz` (or chosen domain) | Acquire before announcing the rebrand |

---

## 4. Agent Builder Impact

### 4.1 Active API Callers

Any builder or service currently calling `x402books.xyz/api/...` will need to update their endpoint URL. Known external callers:
- **Hermes**: calls `/api/cron/refresh-books` — must be updated at the Hermes config level
- **Any agent builder using the v1 API**: must update their base URL

**Minimum redirect window:** 12 months from launch of Zetta domain.

### 4.2 Submitted Manifests

Existing manifests in the registry do not reference the x402Books domain. The manifest format itself is unaffected by the rebrand. Builders who have submitted manifests require no action.

---

## 5. SEO and Backlinks

| Asset | Risk |
|-------|------|
| "x402books" search term | Abandoning this term means losing any accumulated search visibility |
| Backlinks pointing to x402books.xyz | Will redirect with 301; link equity is partially preserved |
| "x402 protocol" adjacent searches | May lose adjacency benefit; "Zetta" starts with no protocol association |

---

## 6. Brand String Count (Approximate)

Run the following to get a current count before rebrand execution:

```bash
grep -r "x402[Bb]ooks\|x402books" /path/to/repo/src --include="*.ts" --include="*.tsx" --include="*.json" -l
```

---

## 7. Rebrand Readiness Score

**Current score: 38 / 100**

| Dimension | Score | Note |
|-----------|-------|------|
| Codebase audit complete | ✅ | This document |
| API migration plan exists | ❌ | See REBRAND_MIGRATION_PLAN.md |
| New domain acquired | ❌ | Zetta domain not yet confirmed |
| Social handles secured | ❌ | @Zetta availability unknown |
| Builder communication sent | ❌ | No notification plan yet |
| Documentation rewritten | ❌ | Requires domain decision first |
| Trust/attribution work complete | ❌ | Must complete Phases 1–3 first |

**Do not execute the rebrand until score reaches 90+.**
