-- Attribution Truth Fix — 2026-06-22
--
-- Separates attribution from discovery across AEON, Nipmod, and Atrium Hermes.
-- Run in Supabase SQL editor before ERC-8004 ingestion or public launch.
--
-- Rules applied:
--   1. Only manifest-declared EOA/treasury wallets → books eligible
--   2. Smart contracts, token contracts, proxy contracts → never books eligible
--   3. Discovered/admin-added addresses → evidenceSource=admin, address_type classified
--
-- ─── STEP 0: Schema migration (if not already run) ───────────────────────────

alter table registry_agent_wallets
  add column if not exists address_type text
  check (address_type in (
    'eoa','token_contract','proxy_contract',
    'treasury_contract','vault','smart_contract','unknown'
  ))
  default 'unknown';

-- Add unique constraint so ON CONFLICT (agent_name, address) works.
-- Wrapped in DO block so it's idempotent — safe to re-run.
do $$ begin
  alter table registry_agent_wallets
    add constraint uq_registry_agent_wallets_agent_address
    unique (agent_name, address);
exception when duplicate_object then null;
end $$;

-- ─── STEP 1: AEON ─────────────────────────────────────────────────────────────
--
-- Known manifest/operator wallets declared by AEON team:
--   0xf1e958db7d1e4c074377946018ad645db4fb158e  (operator)
--   0x67976cebb5266b50a08c0dcb676e03baf305e3a2  (operator)
--
-- Token contract (never a wallet):
--   0xbf8e8f0e8866a7052f948c16508644347c57aba3  → stored as agent.token_address, not operator wallet

-- Remove token contract if it was ever inserted as a wallet row
delete from registry_agent_wallets
where agent_name = 'Aeon'
  and address ilike '0xbf8e8f0e8866a7052f948c16508644347c57aba3';

-- Remove any other non-manifest wallets from AEON (smart contracts added by discovery)
-- Keep only the 2 declared operator wallets; delete everything else
delete from registry_agent_wallets
where agent_name = 'Aeon'
  and address not ilike '0xf1e958db7d1e4c074377946018ad645db4fb158e'
  and address not ilike '0x67976cebb5266b50a08c0dcb676e03baf305e3a2';

-- Upsert AEON operator wallet 1
insert into registry_agent_wallets (agent_name, address, label, role, chain, confidence, evidence_source, address_type, notes)
values (
  'Aeon',
  '0xf1e958db7d1e4c074377946018ad645db4fb158e',
  'verified wallet',
  'operator',
  'base',
  'declared',
  'manifest',
  'eoa',
  'AEON operator wallet — manifest declared.'
)
on conflict (agent_name, address) do update set
  label         = excluded.label,
  role          = excluded.role,
  chain         = excluded.chain,
  confidence    = excluded.confidence,
  evidence_source = excluded.evidence_source,
  address_type  = excluded.address_type,
  notes         = excluded.notes;

-- Upsert AEON operator wallet 2
insert into registry_agent_wallets (agent_name, address, label, role, chain, confidence, evidence_source, address_type, notes)
values (
  'Aeon',
  '0x67976cebb5266b50a08c0dcb676e03baf305e3a2',
  'verified wallet',
  'operator',
  'base',
  'declared',
  'manifest',
  'eoa',
  'AEON operator wallet — manifest declared.'
)
on conflict (agent_name, address) do update set
  label         = excluded.label,
  role          = excluded.role,
  chain         = excluded.chain,
  confidence    = excluded.confidence,
  evidence_source = excluded.evidence_source,
  address_type  = excluded.address_type,
  notes         = excluded.notes;

-- Update AEON verification status
update registry_agents
set verification_status = 'Wallets Declared',
    evidence_sources    = array['Bankr agent registry', 'AEON framework GitHub', 'Operator manifest'],
    last_checked        = '2026-06'
where name = 'Aeon';

-- ─── STEP 2: Nipmod ───────────────────────────────────────────────────────────
--
-- Known manifest/operator wallet:
--   0xae22c33907572ebce7dab4d71d56f6793b8826ae  (manifest declared)
--
-- Other addresses attached to Nipmod are smart contracts — mark and exclude.

-- Mark the valid manifest wallet
insert into registry_agent_wallets (agent_name, address, label, role, chain, confidence, evidence_source, address_type, notes)
values (
  'Nipmod',
  '0xae22c33907572ebce7dab4d71d56f6793b8826ae',
  'verified wallet',
  'operator',
  'base',
  'declared',
  'manifest',
  'eoa',
  'Nipmod operator wallet — manifest declared.'
)
on conflict (agent_name, address) do update set
  label         = excluded.label,
  role          = excluded.role,
  chain         = excluded.chain,
  confidence    = excluded.confidence,
  evidence_source = excluded.evidence_source,
  address_type  = excluded.address_type,
  notes         = excluded.notes;

-- Mark ALL other Nipmod wallets as smart_contract / discovered
-- (not deleting — keeping for audit trail, but they are ineligible for books)
update registry_agent_wallets
set evidence_source = 'admin',
    address_type    = 'smart_contract',
    label           = 'candidate wallet',
    notes           = 'Discovered address — classified as smart contract. Not used for books.'
where agent_name = 'Nipmod'
  and address not ilike '0xae22c33907572ebce7dab4d71d56f6793b8826ae';

-- ─── STEP 3: Atrium Hermes ────────────────────────────────────────────────────
--
-- Known manifest/operator wallet:
--   0x537c5205262b2807e6481C5D4D36C3C10d6F473d  (manifest declared)
--
-- Other addresses attached to Atrium Hermes are smart contracts — mark and exclude.

-- Mark the valid manifest wallet
insert into registry_agent_wallets (agent_name, address, label, role, chain, confidence, evidence_source, address_type, notes)
values (
  'Atrium Hermes',
  '0x537c5205262b2807e6481C5D4D36C3C10d6F473d',
  'verified wallet',
  'operator',
  'base',
  'declared',
  'manifest',
  'eoa',
  'Atrium Hermes operator wallet — manifest declared.'
)
on conflict (agent_name, address) do update set
  label         = excluded.label,
  role          = excluded.role,
  chain         = excluded.chain,
  confidence    = excluded.confidence,
  evidence_source = excluded.evidence_source,
  address_type  = excluded.address_type,
  notes         = excluded.notes;

-- Mark ALL other Atrium Hermes wallets as smart_contract / discovered
update registry_agent_wallets
set evidence_source = 'admin',
    address_type    = 'smart_contract',
    label           = 'candidate wallet',
    notes           = 'Discovered address — classified as smart contract. Not used for books.'
where agent_name = 'Atrium Hermes'
  and address not ilike '0x537c5205262b2807e6481C5D4D36C3C10d6F473d';

-- ─── STEP 4: Global cleanup — mark all remaining non-sourced wallets ──────────
--
-- Any wallet with no evidence_source is from early discovery before the
-- manifest standard existed. Mark as 'admin' so they correctly show as
-- 'discovered' and never inflate attributed count.

update registry_agent_wallets
set evidence_source = 'admin'
where (evidence_source is null or evidence_source = '')
  and agent_name not in ('Luca'); -- preserve Luca's self-managed status

-- ─── STEP 5: Verification ────────────────────────────────────────────────────
--
-- After running, verify with:

-- Count of truly attributed agents (manifest + non-contract):
-- select count(distinct agent_name) as manifest_attributed_agents
-- from registry_agent_wallets
-- where evidence_source = 'manifest'
--   and (address_type not in ('token_contract','smart_contract','proxy_contract','vault') or address_type is null);

-- Count of discovered-only agents (has wallets but none are manifest+eligible):
-- select count(distinct ra.name) as discovered_agents
-- from registry_agents ra
-- where exists (select 1 from registry_agent_wallets w where w.agent_name = ra.name)
--   and not exists (
--     select 1 from registry_agent_wallets w
--     where w.agent_name = ra.name
--       and w.evidence_source = 'manifest'
--       and (w.address_type not in ('token_contract','smart_contract','proxy_contract','vault') or w.address_type is null)
--   );
