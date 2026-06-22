-- ERC-8004 schema additions — 2026-06-22
-- Run in Supabase SQL editor before first ERC-8004 ingestion run.

alter table registry_agents
  add column if not exists erc8004_agent_id text,
  add column if not exists erc8004_metadata_uri text,
  add column if not exists erc8004_registration_tx text;

-- Index for fast ERC-8004 agent lookups
create index if not exists idx_registry_agents_erc8004_agent_id
  on registry_agents(erc8004_agent_id)
  where erc8004_agent_id is not null;
