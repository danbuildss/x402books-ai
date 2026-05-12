---
version: alpha
name: x402books AI
description: >
  A dual-theme design system for x402books AI — a forest-green accented,
  glass-morphic product with a dark dashboard and a light marketing landing
  page. The accent drives all primary interactions; depth is expressed through
  layered surfaces and diffuse glow shadows rather than hard drop shadows.
colors:
  primary: "#47c78b"
  # ── Dark theme (product / dashboard) ─────────────────────────────────────
  background: "#080b0d"
  surface: "#101617"
  surface-hover: "#151b1e"
  ink: "#f5f8f6"
  ink-muted: "#9ca8a3"
  border: "#263333"
  accent: "#47c78b"
  accent-dim: "#60dd9f"
  negative: "#ff9484"
  api-blue: "#7aa2ff"
  # ── Light theme (landing page) ────────────────────────────────────────────
  background-light: "#eef0ee"
  surface-light: "#fbfbf8"
  surface-soft-light: "#f4f6f3"
  ink-light: "#101615"
  ink-muted-light: "#66706b"
  border-light: "#e2e6e0"
  accent-light: "#0b8f74"
  accent-dark-light: "#07745e"
  accent-soft-light: "#dff7ef"
  negative-light: "#e87d9a"
  # ── Glow / chart palette ─────────────────────────────────────────────────
  glow-a: "#44d7b6"
  glow-b: "#87a6ff"
  glow-c: "#f38ab0"
typography:
  display:
    fontFamily: Inter
    fontSize: 84px
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 52px
    fontWeight: 760
    lineHeight: 1.05
    letterSpacing: -0.015em
  h3:
    fontFamily: Inter
    fontSize: 23px
    fontWeight: 720
    lineHeight: 1.2
  stat:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.1
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.06em
  eyebrow:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.04em
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 22px
  xl: 30px
  full: 9999px
spacing:
  micro: 6px
  xs: 8px
  sm: 14px
  md: 18px
  lg: 24px
  xl: 52px
  container-max: 1440px
  sidebar: 168px
  topbar: 52px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#06100d"
    rounded: "{rounded.full}"
    height: 50px
    padding: 22px
  button-primary-hover:
    backgroundColor: "{colors.accent-dim}"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    height: 50px
    padding: 22px
  button-sm:
    backgroundColor: "{colors.accent}"
    textColor: "#06100d"
    rounded: "{rounded.full}"
    height: 44px
    padding: 18px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: 54px
    padding: 16px
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  chip:
    rounded: "{rounded.full}"
    padding: 6px
  badge-x402:
    backgroundColor: "{colors.accent-soft-light}"
    textColor: "{colors.accent-dark-light}"
    rounded: "{rounded.full}"
---

# x402books AI Design System

## Overview

x402books AI is a financial book-keeping tool powered by the x402 payment protocol. The interface strikes a balance between a professional fintech product and an approachable AI-native experience.

**Brand personality:** trustworthy, precise, modern. The design should feel like a tool a CFO and a developer both enjoy using — dense information is made legible through careful hierarchy, not hidden behind unnecessary chrome.

**Two contexts, one system.** The marketing landing page uses a light, airy palette (`#eef0ee` canvas) with subtle glow effects to convey openness and credibility. The product dashboard flips to a near-black dark theme (`#080b0d`) that keeps the focus on data, reduces eye strain during long sessions, and gives the accent green maximum pop.

**Accent is sacred.** Forest green (`#47c78b` dark / `#0b8f74` light) is the single interaction color. It appears on primary buttons, focus rings, active nav indicators, positive metric values, and nowhere else. Overusing it dilutes its signal.

**Glass morphism for depth.** Layered surfaces use `backdrop-filter: blur(18px)` with semi-transparent backgrounds rather than opaque fills. This keeps the UI feeling light even when components overlap.

## Colors

The palette is rooted in near-black surfaces and a single forest-green accent. The light theme mirrors the same structure with inverted neutrals.

**Dark theme (product dashboard):**
- **Background (#080b0d):** The deepest layer — page background, never used for content surfaces.
- **Surface (#101617):** Default card and panel background, one step above the page.
- **Surface Hover (#151b1e):** Hover state for interactive surfaces and sidebar nav items.
- **Ink (#f5f8f6):** Primary text — high contrast against all dark surfaces.
- **Ink Muted (#9ca8a3):** Secondary text, metadata, labels, timestamps.
- **Border (#263333):** Subtle 1px dividers and card outlines.
- **Accent (#47c78b):** Forest green — the only CTA color. Used for primary buttons, active states, positive deltas, focus rings.
- **Accent Dim (#60dd9f):** Hover/pressed variant of the accent. Slightly lighter.
- **Negative (#ff9484):** Error states, negative financial deltas, destructive actions.
- **API Blue (#7aa2ff):** Reserved for API-related UI elements and chart secondary data.

**Light theme (landing page):**
- **Background (#eef0ee):** Warm off-white canvas.
- **Surface (#fbfbf8):** Card background on the landing.
- **Surface Soft (#f4f6f3):** Subtle section backgrounds, input fills.
- **Ink (#101615):** Primary text on light backgrounds.
- **Ink Muted (#66706b):** Supporting text.
- **Border (#e2e6e0):** Hairline borders and dividers.
- **Accent (#0b8f74):** Darker green tuned for WCAG AA contrast on light backgrounds.
- **Accent Soft (#dff7ef):** Low-contrast accent fill for badges and callout backgrounds.

**Glow palette (hero & chart accents):**
Three ambient colors — Teal (`#44d7b6`), Periwinkle (`#87a6ff`), and Rose (`#f38ab0`) — used exclusively in hero glow effects, background gradients, and donut chart segments. Never use these for interactive elements.

## Typography

A single typeface — **Inter** — carries the entire system. Variation in weight and size creates hierarchy without introducing a second family.

- **Display (84px / 800):** Hero headline on the landing page. Rendered fluid via `clamp(48px, 6.4vw, 84px)`. Line-height 0.96 keeps large text tight and impactful.
- **H2 (52px / 760):** Section headings on the landing. Rendered fluid via `clamp(32px, 4.4vw, 52px)`.
- **H3 (23px / 720):** Sub-section headings and modal titles.
- **Stat (26px / 600):** KPI numbers on dashboard stat cards. Line-height kept tight at 1.1 to anchor the figure visually.
- **Body LG (14px / 400):** Primary reading text in dashboard content, tables, and the landing page body copy.
- **Body MD (13px / 400):** Supporting text in panels, sidebars, and secondary card content.
- **Body SM (12px / 500):** Tertiary text, helper hints, and tooltip copy.
- **Label Caps (10px / 700, 0.06em spacing):** Uppercase category labels on stat cards ("TOTAL SPENT", "THIS MONTH"). Always uppercase. Never use for body copy.
- **Eyebrow (11px / 600, 0.04em spacing):** Short labels used in pill badges above hero sections.

Weight scale in use: 400 (regular), 500, 600, 700, 720, 760, 780, 800. Intermediate weights (720–780) are used for large display text where precise optical weight matters.

## Layout

The dashboard uses a **fixed sidebar + fluid content** model. The landing page uses a **centered max-width column** with full-bleed section backgrounds.

**Dashboard grid:**
- Sidebar: fixed at 168px wide, full viewport height.
- Topbar: fixed at 52px tall, spanning content area width.
- Content area: fluid, fills remaining width, scrollable.
- Card grid gap: 14px between cards.

**Landing page:**
- Max content width: 1440px, centered with auto margins.
- Section padding scales from 12px on mobile to 52–56px on desktop.
- Single-column on ≤980px. Floating decorative elements hidden on ≤620px.

**Spacing scale (8px base, 6px micro-step):**
- `micro` (6px): icon-to-text gaps, tight inline spacing.
- `xs` (8px): between related inline elements.
- `sm` (14px): between items in a list, card grid gap.
- `md` (18px): internal card padding (compact).
- `lg` (24px): internal card padding (default), section sub-spacing.
- `xl` (52px): between major page sections.

**Responsive breakpoints:**
- ≤980px: single-column sections, sidebar collapses, nav hidden behind hamburger.
- ≤620px: h1 clamp floor kicks in (43px), full-width buttons, main padding drops to 12px.

## Elevation & Depth

Elevation is expressed through **layered tonal surfaces** and **diffuse ambient shadows**, not sharp drop shadows.

**Surface layers (dark theme):**
1. Page background `#080b0d`
2. Default surface `#101617` (cards, panels)
3. Hover surface `#151b1e` (interactive state)
4. Glass overlay `rgba(20, 29, 30, 0.72)` + `backdrop-filter: blur(18px)`

**Shadow tokens:**
- Dashboard cards: `0 24px 80px rgba(28, 38, 34, 0.16)` — a wide, soft shadow that lifts cards off the background without creating a hard edge.
- Landing hero: `0 30px 90px rgba(28, 38, 34, 0.10)` (light) / `0 28px 90px rgba(0, 0, 0, 0.42)` (dark) — diffuse and ambient.
- Floating pills: `0 18px 50px rgba(28, 38, 34, 0.12)` — lighter, for small hovering elements.

**Glass morphism rules:**
- Use `backdrop-filter: blur(18px)` on overlays, modals, and the topbar.
- Pair with a semi-transparent surface color (≤72% opacity) to let the background bleed through.
- Never use glass morphism on interactive surfaces that need clear affordance (buttons, inputs).

## Shapes

The shape language is **softly rounded with a preference for pills**. Sharp corners do not appear anywhere.

- **XS (4px):** Micro elements only — small icon badges, tight inline chips.
- **SM (6px):** Icon-only buttons, secondary badges.
- **MD (8px):** Stat cards, table containers, compact panels.
- **LG (22px):** Default dashboard cards, main content panels.
- **XL (30px):** Hero/feature cards on the landing page, large modal containers.
- **Full (9999px):** All buttons, all pill badges, all category chips. Pill shape is the default for any interactive text element.

The card radius (LG/XL) and button radius (Full) form a deliberate contrast: containers are softly rectangular, interactive elements are pills. This contrast makes clickable elements immediately legible.

## Components

**Primary Button:**
Forest-green fill (`{colors.accent}`), very dark text (`#06100d`) for contrast, pill radius, 50px height. Hover shifts background to `{colors.accent-dim}`. Use for the single most important action per screen.

**Secondary Button:**
Glass fill (6% white), `{colors.accent}` text and border, pill radius, same sizing as primary. Hover increases background to ~12% white opacity. Use for secondary actions alongside a primary button.

**Small Button:**
Same as primary but 44px height, 18px horizontal padding. Use inside cards and compact contexts.

**Card:**
`{colors.surface}` background, 1px `{colors.border}` border, `{rounded.xl}` corners, `{spacing.lg}` padding. Cards on the dashboard may add a subtle gradient or glass overlay for visual layering. Never nest cards more than one level deep.

**Input:**
54px height, `{colors.surface}` background, 1px `{colors.border}` border, `{rounded.lg}` corners, 16px horizontal padding. Labels sit 8px above with 13px / 720-weight text. Focus state: `{colors.accent-light}` border at 55% opacity + matching box-shadow at 10% opacity.

**Stat Card:**
Compact card variant (MD radius, 18–20px padding). Contains: a `label-caps` header, a `stat`-size numeric value, and an optional trend indicator using `{colors.accent}` (positive) or `{colors.negative}` (negative).

**Nav Item (Sidebar):**
168px wide, full-bleed hover background (`{colors.surface-hover}`). Active state: 2px left border in `{colors.accent}` + `{colors.surface-hover}` background. Icon + label at 13px / 500 weight.

**Chip / Category Badge:**
Pill radius, 6px vertical padding, 9–12px horizontal padding. Background and text color are category-specific (drawn from the semantic palette). The x402 protocol badge uses `{colors.accent-soft-light}` background with `{colors.accent-light}` text, 9px / 800-weight text.

**Table:**
13–14px body text, collapsed 1px `{colors.border}` borders between rows, `{rounded.lg}` container with `overflow: hidden`. Column headers use `label-caps` style. Row hover: `{colors.surface-hover}` background.

## Do's and Don'ts

- **Do** use `{colors.accent}` for exactly one primary action per screen. If everything is green, nothing is.
- **Don't** use accent green for decorative purposes — glow effects use the separate glow palette (`{colors.glow-a}`, `{colors.glow-b}`, `{colors.glow-c}`).
- **Do** maintain WCAG AA contrast on all text. In the dark theme, `{colors.ink-muted}` on `{colors.surface}` is the minimum acceptable contrast — do not go lighter.
- **Don't** use sharp corners (0px radius) anywhere. The minimum is `{rounded.xs}` (4px).
- **Do** use pill radius (`{rounded.full}`) for all buttons and inline badges without exception.
- **Don't** mix the dark and light surface colors in the same view. The two themes are context-specific: dark for product, light for landing.
- **Do** keep the sidebar at exactly 168px and the topbar at exactly 52px — layout-critical components in the dashboard depend on these fixed dimensions.
- **Don't** add glass morphism (`backdrop-filter`) to buttons or inputs — it degrades interactive affordance.
- **Do** use `label-caps` (10px, 700, uppercase) for all stat card headers. Never use mixed-case for those labels.
- **Don't** introduce a second typeface. Inter handles all use cases; weight variation is the only typographic tool.
