-- DB-driven prompt optimizer + image generation retry controls.

ALTER TABLE image_generation_settings
  ADD COLUMN IF NOT EXISTS prompt_optimizer JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "policy": "best_effort",
    "provider": "openai",
    "model": "gpt-5.4-nano",
    "system_template": "You are an expert image prompt optimizer. Rewrite the user prompt to be clearer and more effective for modern image generation models. Preserve all hard constraints and factual details (brand/logo requirements, reference-image usage, safety-sensitive requirements). Do not add unrelated content. Return only the optimized prompt text, no markdown and no explanation.",
    "timeout_ms": 2500,
    "max_tokens": 800,
    "temperature": 0.3
  }'::jsonb;

ALTER TABLE image_generation_settings
  ADD COLUMN IF NOT EXISTS generation_retry JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "max_attempts": 3,
    "base_delay_ms": 1500,
    "max_delay_ms": 12000,
    "retry_on_statuses": [429, 500, 502, 503, 504],
    "queue_attempts": 2,
    "queue_backoff_ms": 5000
  }'::jsonb;

COMMENT ON COLUMN image_generation_settings.prompt_optimizer IS
  'Text-to-text optimizer settings applied before image generation. policy=best_effort falls back to original prompt.';

COMMENT ON COLUMN image_generation_settings.generation_retry IS
  'Retry settings for provider calls and async queue attempts to absorb transient 429/5xx outages.';

