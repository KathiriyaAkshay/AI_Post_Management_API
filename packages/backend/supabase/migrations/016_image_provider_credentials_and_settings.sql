-- Encrypted API keys per image provider + singleton settings row (active provider).
-- Access only via backend service role (RLS: no policies for authenticated = deny).

CREATE TABLE image_generation_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  active_provider TEXT NOT NULL DEFAULT 'mock'
    CHECK (active_provider IN ('mock', 'openai', 'google', 'grok', 'external_http')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO image_generation_settings (id, active_provider)
VALUES ('default', 'mock')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE image_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider TEXT NOT NULL
    CHECK (provider IN ('openai', 'google', 'grok')),

  label TEXT,

  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version SMALLINT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_image_provider_credentials_provider UNIQUE (provider)
);

CREATE INDEX idx_image_provider_credentials_provider ON image_provider_credentials(provider);

CREATE OR REPLACE FUNCTION set_image_provider_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_image_provider_credentials_updated_at
  BEFORE UPDATE ON image_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION set_image_provider_credentials_updated_at();

CREATE OR REPLACE FUNCTION set_image_generation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_image_generation_settings_updated_at
  BEFORE UPDATE ON image_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_image_generation_settings_updated_at();

ALTER TABLE image_generation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_provider_credentials ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE image_generation_settings IS 'Singleton: which image provider adapter runs (mock, openai, google, grok, external_http)';
COMMENT ON TABLE image_provider_credentials IS 'Per-provider API secret; ciphertext is AES-256-GCM; iv and auth_tag stored per row';
COMMENT ON COLUMN image_provider_credentials.ciphertext IS 'Base64 ciphertext';
COMMENT ON COLUMN image_provider_credentials.iv IS '12-byte nonce for GCM, base64';
COMMENT ON COLUMN image_provider_credentials.auth_tag IS 'GCM auth tag, base64';
