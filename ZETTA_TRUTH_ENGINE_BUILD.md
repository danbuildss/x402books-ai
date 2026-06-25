# Zetta Truth Engine Build

## Goal

Strengthen the product truth layer underneath Luca.

This build is focused on:

- manifest truth
- wallet-role truth
- books eligibility truth
- evidence-backed financial classification

## Core Rule

Luca can only be as strong as the truth engine underneath him.

The truth engine should answer:

- which wallets were discovered
- which wallets were declared
- which wallets were verified
- which wallets are books-eligible
- what evidence supports a claim
- what revenue is operating revenue vs quarantined inflow

## What This Pack Adds

### SQL proposal

- `supabase/zetta-truth-engine.sql`

Adds proposed tables for:

- manifest submissions
- wallet claims and role evidence
- books eligibility snapshots
- revenue classification events
- evidence packets

### Schemas

- `schemas/agent-wallet-manifest.schema.json`
- `schemas/wallet-role-graph.schema.json`
- `schemas/books-eligibility.schema.json`

### Scripts

- `scripts/validate_agent_manifest.py`
- `scripts/normalize_wallet_graph.py`
- `scripts/assess_books_eligibility.py`

## Why This Matters

Without this layer:

- registry truth drifts from books truth
- wallet roles stay fuzzy
- confidence language becomes fragile
- revenue output becomes harder to defend

## Build Order

### Phase 1

- manifest validation
- wallet-role graph
- books eligibility snapshot

### Phase 2

- evidence packets
- revenue classification events
- confidence exposure

### Phase 3

- admin review flows
- automatic ingestion
- anomaly detection on top of truth data

## Output Model

The truth engine should increasingly produce:

- validated manifest
- normalized wallet graph
- books eligibility snapshot
- evidence packet
- revenue classification packet

These become the substrate for Luca, registry pages, admin review, and reports.
