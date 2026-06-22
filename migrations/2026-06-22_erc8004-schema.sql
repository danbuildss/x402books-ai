-- ERC-8004 schema additions — 2026-06-22
-- Run in Supabase SQL editor before first ERC-8004 ingestion run.

-- Identity
alter table registry_agents
  add column if not exists erc8004_agent_id text,
  add column if not exists erc8004_metadata_uri text,
  add column if not exists erc8004_registration_tx text,
  -- Identity layer
  add column if not exists erc8004_did text,
  add column if not exists erc8004_description text,
  -- Reputation layer (queried from ReputationRegistry 0x8004BAa1...)
  add column if not exists erc8004_reputation_score numeric,
  add column if not exists erc8004_review_count integer,
  -- Validation layer (queried from ValidationRegistry)
  add column if not exists erc8004_validation_count integer,
  add column if not exists erc8004_validation_status text;

-- Index for fast ERC-8004 agent lookups
create index if not exists idx_registry_agents_erc8004_agent_id
  on registry_agents(erc8004_agent_id)
  where erc8004_agent_id is not null;

-- Index DID for future did:erc8004: resolution
create index if not exists idx_registry_agents_erc8004_did
  on registry_agents(erc8004_did)
  where erc8004_did is not null;
