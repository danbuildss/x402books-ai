-- B20 Token Intelligence Tables — 2026-06-23
--
-- Adds the B20 intelligence layer to Zetta.
--
-- b20_tokens   — token registry: identity, issuer, agent link, manifest status
-- b20_activity — mint/burn/transfer event log
--
-- Data integrity rules (baked into schema comments, enforced in application layer):
--   token contracts        → NEVER books-eligible
--   token transfers        → NOT operating revenue
--   issuer wallet          → NOT attributed unless declared in .agent/wallets.json
--   B20 activity           → does NOT enter Agent GDP
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS throughout.
--
-- After running, verify:
--   select count(*) from b20_tokens;   → 0  (populated by /api/admin/index-b20)
--   select count(*) from b20_activity; → 0  (populated by activity scanner)

create table if not exists b20_tokens (
  address             text        primary key,
  name                text,
  symbol              text,
  decimals            integer,
  total_supply        text,                  -- raw bigint as string (uint256)
  issuer_wallet       text,                  -- contract deployer / creator
  owner_wallet        text,                  -- Ownable.owner() if present
  deployment_tx       text,
  deployed_block      bigint,
  chain               text        not null default 'base',
  deployed_at         timestamptz,
  metadata_uri        text,
  linked_agent_name   text        references registry_agents(name) on delete set null,
  link_method         text        not null default 'none',    -- none | manifest | known_token | erc8004 | admin
  link_confidence     text,                                   -- confirmed | inferred | candidate
  manifest_status     text        not null default 'none',   -- none | candidate | attributed
  luca_summary        text,
  last_indexed_at     timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists b20_tokens_linked_agent_idx   on b20_tokens(linked_agent_name);
create index if not exists b20_tokens_issuer_wallet_idx  on b20_tokens(issuer_wallet);
create index if not exists b20_tokens_manifest_status_idx on b20_tokens(manifest_status);
create index if not exists b20_tokens_created_at_idx     on b20_tokens(created_at desc);

create table if not exists b20_activity (
  id              uuid        primary key default gen_random_uuid(),
  token_address   text        not null references b20_tokens(address) on delete cascade,
  event_type      text        not null,   -- mint | burn | transfer
  tx_hash         text        not null,
  block_number    bigint,
  from_address    text,
  to_address      text,
  amount_raw      text,                   -- raw bigint as string
  log_index       integer,
  block_timestamp timestamptz,
  created_at      timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists b20_activity_token_address_idx on b20_activity(token_address);
create index if not exists b20_activity_event_type_idx    on b20_activity(event_type);
create index if not exists b20_activity_block_ts_idx      on b20_activity(block_timestamp desc);
