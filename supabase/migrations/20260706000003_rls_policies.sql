-- ============================================================
-- Migration: Row Level Security policies
--
-- Policy design:
--   PUBLIC SELECT  → anyone can read agent profiles, wallets, books cache
--   SERVICE ROLE   → write access for server-side code (Vercel functions)
--   ANON / JWT     → read-only; no direct writes from the browser
--
-- Tables without RLS: registry_pending_updates, reports, wallets, transactions
-- These are admin/service-only and should NEVER be exposed via the anon key.
-- ============================================================

-- ── registry_agents ───────────────────────────────────────────────────────────
ALTER TABLE registry_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registry_agents_public_read" ON registry_agents;
CREATE POLICY "registry_agents_public_read"
  ON registry_agents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "registry_agents_service_write" ON registry_agents;
CREATE POLICY "registry_agents_service_write"
  ON registry_agents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── registry_agent_wallets ────────────────────────────────────────────────────
ALTER TABLE registry_agent_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registry_agent_wallets_public_read" ON registry_agent_wallets;
CREATE POLICY "registry_agent_wallets_public_read"
  ON registry_agent_wallets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "registry_agent_wallets_service_write" ON registry_agent_wallets;
CREATE POLICY "registry_agent_wallets_service_write"
  ON registry_agent_wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── agent_books_cache ─────────────────────────────────────────────────────────
ALTER TABLE agent_books_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_books_cache_public_read" ON agent_books_cache;
CREATE POLICY "agent_books_cache_public_read"
  ON agent_books_cache FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "agent_books_cache_service_write" ON agent_books_cache;
CREATE POLICY "agent_books_cache_service_write"
  ON agent_books_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── registry_pending_updates (service-only, no public read) ───────────────────
ALTER TABLE registry_pending_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registry_pending_updates_service_only" ON registry_pending_updates;
CREATE POLICY "registry_pending_updates_service_only"
  ON registry_pending_updates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── wallets + transactions + reports (service-only) ───────────────────────────
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_service_only" ON public.wallets;
CREATE POLICY "wallets_service_only"
  ON public.wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_service_only" ON public.transactions;
CREATE POLICY "transactions_service_only"
  ON public.transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_service_only" ON public.reports;
CREATE POLICY "reports_service_only"
  ON public.reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Verification query ────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'registry_agents', 'registry_agent_wallets', 'agent_books_cache',
--     'registry_pending_updates', 'wallets', 'transactions', 'reports'
--   )
-- ORDER BY tablename;
