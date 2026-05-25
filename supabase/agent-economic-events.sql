-- agent_economic_events: tracks autonomous agent inference economics.
-- Separate from wallet transactions — agent-centric, supports future registry/profile pages.

CREATE TABLE IF NOT EXISTS agent_economic_events (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id       text        NOT NULL,
  agent_name     text,
  wallet_address text,
  event_type     text        NOT NULL CHECK (event_type IN (
                               'inference_purchase',
                               'inference_sale',
                               'provider_spend',
                               'fallback_provider_spend',
                               'api_cost',
                               'agent_revenue',
                               'wallet_inflow',
                               'wallet_outflow',
                               'unknown_agent_activity'
                             )),
  provider       text,
  amount         numeric,
  token          text        DEFAULT 'USDC',
  direction      text        CHECK (direction IN ('inflow', 'outflow', 'neutral')),
  tx_hash        text,
  metadata       jsonb,
  timestamp      timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aee_agent_ts    ON agent_economic_events (agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aee_event_type  ON agent_economic_events (event_type);
CREATE INDEX IF NOT EXISTS idx_aee_wallet      ON agent_economic_events (wallet_address);
