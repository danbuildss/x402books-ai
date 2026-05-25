-- agent_economic_events: tracks autonomous agent inference economics.
-- Separate from the wallet transactions table — agent-centric, not wallet-centric.
-- Events can be on-chain (tx_hash set) or off-chain (API costs, provider bills).

CREATE TABLE IF NOT EXISTS agent_economic_events (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name    text        NOT NULL,
  wallet_address text,
  event_type    text        NOT NULL CHECK (event_type IN (
                              'inference_purchase',
                              'inference_sale',
                              'provider_spend',
                              'fallback_provider_spend',
                              'api_cost',
                              'agent_revenue',
                              'unknown_agent_activity'
                            )),
  provider      text,        -- e.g. "Surplus", "Hermes", "Alchemy", "OpenAI"
  amount_usd    numeric,
  token         text        DEFAULT 'USDC',
  direction     text        CHECK (direction IN ('inflow', 'outflow')),
  tx_hash       text,
  metadata      jsonb,
  ts            timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aee_agent_ts     ON agent_economic_events (agent_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_aee_event_type   ON agent_economic_events (event_type);
CREATE INDEX IF NOT EXISTS idx_aee_wallet       ON agent_economic_events (wallet_address);
