# Rebrand Migration Plan: x402Books → Zetta

**Status:** Draft. Not for execution. Complete Phases 1–3 of the remediation plan first.
**Prerequisite:** REBRAND_AUDIT.md reviewed and all blockers resolved.
**Target:** Zero broken integrations, zero data loss, zero trust discontinuity.

---

## Guiding Principles

1. **Nothing breaks for existing users.** Every API call, every backlink, every bookmark continues to work for a minimum of 12 months post-rebrand.
2. **Builders are notified before, not after.** No caller discovers the rebrand by hitting a broken URL.
3. **The product ships first, the name changes second.** The rebrand is a name change on top of a trusted product — not a fresh start.
4. **Domain redirect is not enough.** Code, environment variables, documentation, social handles, and external callers all require explicit migration.

---

## Phase 0 — Pre-Conditions (Must Complete Before Any Rebrand Work)

| Item | Owner | Done? |
|------|-------|-------|
| Phase 1 trust work shipped (GDP methodology, homepage signals, manifest visibility) | Engineering | ❌ |
| Phase 2 data quality alerts shipped | Engineering | ❌ |
| Phase 3 attribution flow improvements shipped | Engineering | ❌ |
| Zetta domain acquired (e.g. zetta.xyz, getzetta.ai, or chosen name) | Founder | ❌ |
| @Zetta (or chosen) Twitter/X handle secured | Founder | ❌ |
| Legal: "Zetta" name cleared for use in intended markets | Founder/Legal | ❌ |
| Hermes updated to use new API domain BEFORE domain goes live | Engineering/Hermes team | ❌ |

---

## Phase 1 — Infrastructure Setup (Parallel to Product Work)

### 1.1 Domain

1. Acquire Zetta domain (do not announce)
2. Configure DNS but do not activate redirect yet
3. Add Zetta domain to Vercel project alongside existing x402books.xyz
4. Verify HTTPS and certificate provisioning on new domain
5. Set x402books.xyz as redirect-only AFTER new domain is confirmed live

### 1.2 Environment Variables

Rename in Vercel dashboard **before** deploying new code. Old names must continue to work during the transition window.

| Old Name | New Name | Files Referencing |
|----------|----------|-------------------|
| `X402BOOKS_INTERNAL_SECRET` | `INTERNAL_SECRET` (or `ZETTA_INTERNAL_SECRET`) | `src/lib/internal-auth.ts` |
| `LUCA_ADMIN_CHAT_ID` | Unchanged (Telegram is internal) | `src/app/api/cron/daily-report/route.ts` |
| `APP_URL` value | Update from `https://x402books.xyz` to new domain | `src/app/api/cron/daily-report/route.ts` |

**Strategy:** Add new env var names while keeping old ones active. Update code to read new names. Remove old names only after confirming deployment is stable.

### 1.3 Social Handle Migration

| Platform | Action | Timing |
|----------|--------|--------|
| Twitter/X | Rename @x402Books to @Zetta (or chosen handle). Announce on old handle before rename. | After domain is live |
| Telegram | Rename channel. Telegram channel username changes require support. | After domain is live |

---

## Phase 2 — Codebase Migration

Execute as a single PR. Do not merge until Phase 1 infrastructure is confirmed live.

### 2.1 Files to Update

**Core brand strings:**

```
src/app/layout.tsx
  - title: "x402Books AI" → "Zetta"
  - og:site_name → "Zetta"
  - og:url → new domain
  - twitter:site, twitter:creator → new handle

src/app/page.tsx
  - lp-eyebrow: "x402Books · Financial Identity..." → "Zetta · Financial Identity..."
  - "How x402Books Works" → "How Zetta Works"
  - All body copy references to "x402Books"
  - Social links (Twitter, Research CTAs)

src/app/home-header.tsx
  - Twitter link href → new handle URL
  - Telegram link href → new channel URL

src/app/api/cron/daily-report/route.ts
  - APP_URL → new domain

src/lib/internal-auth.ts
  - If env var is renamed, update the process.env reference

src/components/site-footer.tsx
  - Brand name in footer copy

src/app/methodology/page.tsx
  - "x402Books" references in content

CLAUDE.md
  - North star document references (update for internal clarity)
```

**Pattern to find all remaining instances before merging:**

```bash
grep -rn "x402[Bb]ooks\|x402books" src/ --include="*.ts" --include="*.tsx"
```

This must return zero matches before the PR merges.

### 2.2 API Endpoint Handling

**Do not change API route paths.** The URL paths (`/api/v1/agent-books/[slug]`, etc.) are the API contract. Only the domain changes.

Add 301 redirect rules in Vercel or `next.config.js` so that requests to `x402books.xyz/api/...` redirect to `zetta.xyz/api/...` with full path preservation:

```js
// next.config.js — add to redirects
{
  source: "/:path*",
  has: [{ type: "host", value: "x402books.xyz" }],
  destination: "https://zetta.xyz/:path*",
  permanent: true,
}
```

### 2.3 Documentation Rewrite

All pages under `/developer` and `/methodology` must be rewritten to replace x402Books with Zetta. Content remains identical; only brand references change.

---

## Phase 3 — Builder Notification

Send this communication **before** the rebrand goes live. Builders must not discover the rebrand by hitting a 301.

**Communication checklist:**

- [ ] Email or Telegram message to all manifest submitters on record
- [ ] Post from @x402Books Twitter before handle rename: "x402Books is becoming Zetta. Here's what changes for you: [nothing]. Here's what changes: [brand, domain]. Old links redirect for 12 months."
- [ ] Update any Discord/Telegram group descriptions
- [ ] If there is a developer mailing list, send migration notice

**Message content (draft):**

> x402Books is rebranding to Zetta. This is a name change only — your manifests, your books, your API integrations, and your data are unchanged.
>
> What changes: the domain and the name.
> What stays the same: everything else.
>
> x402books.xyz will redirect to zetta.xyz for at least 12 months. No API calls will break. No data will be lost.
>
> You do not need to do anything. But if you want to update your API base URL to the new domain, you can do so at any time after [DATE].

---

## Phase 4 — Launch and Verification

### 4.1 Smoke Test Checklist

After deploying the rebrand PR:

- [ ] `https://zetta.xyz` loads the homepage with new brand
- [ ] `https://x402books.xyz` redirects to `https://zetta.xyz` with 301
- [ ] `https://x402books.xyz/registry/aeon` redirects to `https://zetta.xyz/registry/aeon`
- [ ] `https://x402books.xyz/api/cron/refresh-books` redirects correctly
- [ ] `https://zetta.xyz/api/cron/refresh-books` works with existing internal secret
- [ ] Hermes cron refresh returns `{"ok":true}` against new domain
- [ ] Leaderboard shows correct data under new brand
- [ ] Agent profiles load correctly
- [ ] All nav links work
- [ ] Social links point to new handles
- [ ] Twitter @handle resolves to the Zetta account

### 4.2 Rollback Plan

If the domain redirect or Vercel configuration causes issues:

1. In Vercel, revert the production domain to x402books.xyz as primary
2. The codebase can be reverted via `git revert` on the brand PR
3. Hermes must revert to x402books.xyz API calls if the new domain is unreachable
4. Maximum acceptable downtime: 0 minutes (domain config is instant)

---

## Timeline (Suggested)

| Week | Activity |
|------|----------|
| Now → +4 weeks | Complete Phases 1–3 of remediation plan |
| +4 weeks | Acquire Zetta domain and social handles |
| +5 weeks | Infrastructure setup (Phase 1 above) |
| +6 weeks | Codebase migration PR (Phase 2) |
| +7 weeks | Builder notification sent (Phase 3) |
| +7 weeks | Rebrand goes live (Phase 4) |
| +8 weeks | Post-launch verification and monitoring |

---

## Rebrand Readiness Gate

The rebrand does not go live until every item below is checked:

- [ ] All remediation plan phases (1–3) shipped and stable in production
- [ ] Zetta domain acquired and configured in Vercel
- [ ] New social handles secured
- [ ] Legal clearance confirmed
- [ ] Hermes updated to new domain
- [ ] Builder notification drafted and reviewed
- [ ] Codebase migration PR reviewed and approved
- [ ] Smoke test checklist prepared
- [ ] Rollback plan confirmed with team
- [ ] `grep -rn "x402[Bb]ooks" src/` returns zero matches

**Readiness score target: 95/100 before any public announcement.**
