// Model routing layer — selects the right model based on task complexity.
// Fast tasks get gpt-4.1-mini (low latency, cheap). Complex reasoning gets gpt-4.1.

export type ModelTier = "fast" | "capable";

export interface ModelConfig {
  model: string;
  max_tokens: number;
  tier: ModelTier;
}

const MODELS: Record<ModelTier, ModelConfig> = {
  fast: {
    model: process.env.LUCA_MODEL_FAST ?? process.env.LLM_MODEL ?? "gpt-4.1-mini",
    max_tokens: 512,
    tier: "fast",
  },
  capable: {
    model: process.env.LUCA_MODEL_CAPABLE ?? process.env.LLM_MODEL ?? "gpt-4.1",
    max_tokens: 2048,
    tier: "capable",
  },
};

export interface RoutingInput {
  query: string;
  hasToolCalls?: boolean;      // any tool use in prior turns
  estimatedTokens?: number;   // rough token estimate for context
  forceCapable?: boolean;
}

// Patterns that require deeper reasoning
const CAPABLE_PATTERNS = [
  /compar(e|ison)/i,
  /trend(s)?\s+over/i,
  /explain\s+(why|how)/i,
  /analyz[es]/i,
  /forecast/i,
  /runway/i,
  /anomal/i,
  /risk/i,
  /recommend/i,
  /strateg/i,
  /benchmark/i,
  /versus|vs\./i,
  /deep.?dive/i,
  /full\s+report/i,
];

export function routeModel(input: RoutingInput): ModelConfig {
  if (input.forceCapable) return MODELS.capable;

  const q = input.query.toLowerCase();

  // Large context windows need a capable model to reason across them
  if ((input.estimatedTokens ?? 0) > 3000) return MODELS.capable;

  // Complex question patterns
  if (CAPABLE_PATTERNS.some((p) => p.test(q))) return MODELS.capable;

  // Multi-step tool use benefits from stronger reasoning
  if (input.hasToolCalls) return MODELS.capable;

  return MODELS.fast;
}

export function getModelConfig(tier: ModelTier): ModelConfig {
  return MODELS[tier];
}
