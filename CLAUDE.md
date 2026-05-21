# x402Books AI — Project Context

## What This Is
Financial intelligence layer for Base USDC wallets and AI agents. Users paste a wallet address and get clean books: spend/income breakdown, x402 agent payment detection, AI categorization, reports, and a public shareable report URL.

Luca is the AI agent face of the product — a Telegram bot (`@AskLucaBot`) and branded identity powered by x402Books AI. There is also a `$LUCA` ecosystem token on Base.

## Stack
- **Framework:** Next.js 15 (App Router), React 19
- **Styling:** Custom CSS (no Tailwind — design system defined in `DESIGN.md`)
- **Database:** Supabase (Postgres)
- **Auth:** Privy (`@privy-io/react-auth`)
- **AI:** Anthropic Claude (`@anthropic-ai/sdk ^0.95.0`) for summaries, OpenAI for transaction categorization
- **Data:** Alchemy API for Base ERC-20 transfers, DexScreener + Dune Analytics for token prices
- **Deployment:** Vercel

## Key Environment Variables
```
ANTHROPIC_API_KEY        # Claude AI summaries
OPENAI_API_KEY           # Transaction categorization (fallback to rules if missing)
ALCHEMY_API_KEY          # Base ERC-20 transfer fetch
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN       # @AskLucaBot
PRIVY_APP_ID
PRIVY_APP_SECRET
BANKR_API_KEY            # Agent search
LUCA_ADMIN_PASSWORD      # /luca-admin gate
```

## Architecture

### API Routes (`src/app/api/`)
| Route | Purpose |
|---|---|
| `/api/scan` | Full wallet scan → returns ledger data |
| `/api/ai-summary` | Claude-powered financial summary (1 call, no history) |
| `/api/categorize` | OpenAI transaction categorization |
| `/api/telegram` | Telegram webhook receiver + setup |
| `/api/ledger/*` | Summary, transactions, report endpoints |
| `/api/v1/*` | Public API v1 (auth via API keys) |
| `/api/registry/*` | Agent registry CRUD + approval flow |
| `/api/export/pdf` | PDF report generation |
| `/api/agent/search` | Bankr agent search |
| `/api/user/wallet` | Per-user saved wallet |

### Core Lib (`src/lib/`)
| File | Purpose |
|---|---|
| `ledger-service.ts` | Orchestrates wallet scan (Alchemy + prices + enrichment) |
| `ledger.ts` | Transaction types, enrichment logic, summary/report builders |
| `ai-categorize.ts` | OpenAI categorization pipeline (rules-first) |
| `telegram-bot.ts` | Telegram command handlers (/scan, /summary, /report) |
| `use-ledger-state.ts` | Client-side state hook for dashboard |
| `alchemy.ts` | Base ERC-20 transfer fetching |
| `dune.ts` | Dune Analytics token price queries |
| `tokens.ts` | DexScreener price lookup |
| `ecosystem-tokens.ts` | Known agent/ecosystem token registry with TTL cache |
| `api-keys.ts` | Developer API key management |
| `registry-db.ts` | Agent registry DB operations |
| `v1-auth.ts` | API v1 authentication |

### Pages
| Route | Purpose |
|---|---|
| `/` | Landing page (light theme) |
| `/dashboard` | Main wallet dashboard (dark theme, `use-ledger-state`) |
| `/luca` | Luca AI agent landing page + live $LUCA token data |
| `/luca-admin` | Password-gated admin: Growth OS, registry approval, roadmap |
| `/registry` | Public agent financial registry |
| `/report/[wallet]` | Public shareable wallet report |
| `/developer` | API key management |

## Design System
Defined in `DESIGN.md`. Key rules:
- **Dark theme** for product/dashboard (`#080b0d` bg, `#47c78b` accent green)
- **Light theme** for landing/marketing (`#eef0ee` bg, `#0b8f74` accent)
- Accent green is the **only** interactive color — do not use it decoratively
- All buttons are pill-shaped (`border-radius: 9999px`)
- Font: Inter only, no second typeface
- No Tailwind — all styles are custom CSS in component files or global CSS

## AI Integration Notes
- `ai-summary/route.ts` uses Anthropic SDK 0.95.x which auto-applies `cache_control` to text blocks for prompt caching. Always pass content as `[{ type: "text", text: someString }]` (typed block array), never as a bare string. Trim text and guard for empty strings before sending to avoid `400 cache_control cannot be set for empty text blocks`.
- Categorization uses OpenAI (`gpt-4.1-mini` default). Falls back to rule-based enrichment if no API key.
- Both AI calls are stateless (no conversation history).

## Token: $LUCA
- Contract: `0xb2b335f832fd3f43461ebd1cd9831d93d9ca4ba3` (Base)
- Used consistently across `/luca` page, `luca-token.ts`, `ecosystem-tokens.ts`
- Price data from DexScreener (live, 30s refresh)

## Conventions
- All monetary values in USDC unless noted
- `wallet` addresses are always lowercase in logic, display-shortened as `0x1234…abcd`
- Time ranges: `"7d" | "14d" | "30d" | "90d"` — default `"30d"`
- Rules-first categorization pipeline, AI is the fallback
- Silent error swallowing on non-critical paths (token price fetches, Dune queries, Telegram edits)
- No TypeScript `any` — types defined in `ledger.ts` and `registry/types.ts`

## Current Branches
| Branch | Status |
|---|---|
| `main` | Production |
| `claude/fix-cache-control-error-gD3hD` | Fix for Anthropic SDK 400 error on empty text blocks — ready to merge |

## Repo Structure
```
src/
  app/
    api/           # All API routes
    dashboard/     # Main dashboard page
    luca/          # Luca agent landing
    luca-admin/    # Admin panel
    registry/      # Agent registry
    report/[wallet]/ # Public report
    developer/     # API key management
  components/      # Shared UI components
  lib/             # Business logic, hooks, utilities
DESIGN.md          # Full design system spec
PRODUCT_PLAN.md    # Original MVP plan
ROADMAP.md         # Partnership strategy and roadmap
```
