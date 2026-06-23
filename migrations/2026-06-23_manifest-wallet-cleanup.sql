-- Manifest Wallet Cleanup — 2026-06-23
--
-- Demotes manifest wallets whose address_type is NOT books-eligible
-- to evidence_source='admin' so they stop inflating attributed counts.
--
-- Books-eligible allowlist: eoa, treasury_contract only.
-- Wallets with token_contract, smart_contract, proxy_contract, vault, unknown
-- must not be counted as manifest-attributed.
--
-- Safe to re-run: only affects evidence_source='manifest' rows
-- with non-allowlisted address types.
--
-- After running, verify:
--   select count(*) from registry_agent_wallets
--   where evidence_source = 'manifest'
--     and address_type in ('eoa', 'treasury_contract');
--   → should equal 4 (AEON×2, Nipmod×1, Atrium Hermes×1)

update registry_agent_wallets
set
  evidence_source = 'admin',
  label           = 'candidate wallet',
  notes           = 'Demoted from manifest: address_type=' ||
                    coalesce(address_type, 'unknown') ||
                    ' is not books-eligible. Re-submit via manifest with correct wallet type. Original notes: ' ||
                    coalesce(notes, '')
where evidence_source = 'manifest'
  and (
    address_type not in ('eoa', 'treasury_contract')
    or address_type is null
  );
