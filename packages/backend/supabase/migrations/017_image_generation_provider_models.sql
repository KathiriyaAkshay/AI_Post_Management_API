-- Per-provider image model ids (e.g. OpenAI dall-e-3 vs gpt-image-1) for testing without redeploy.

ALTER TABLE image_generation_settings
ADD COLUMN IF NOT EXISTS provider_models JSONB NOT NULL DEFAULT '{"openai":"dall-e-3"}'::jsonb;

COMMENT ON COLUMN image_generation_settings.provider_models IS 'Map provider -> model id, e.g. {"openai":"dall-e-3","google":"...","grok":"..."}; merged on PATCH';
