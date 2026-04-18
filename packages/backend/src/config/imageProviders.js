/** Values stored in image_generation_settings.active_provider */
export const IMAGE_PROVIDER_IDS = ['mock', 'openai', 'google', 'grok', 'external_http'];

/** Providers that store an encrypted API key in image_provider_credentials */
export const CREDENTIAL_PROVIDER_IDS = ['openai', 'google', 'grok'];

export function isCredentialProvider(provider) {
  return CREDENTIAL_PROVIDER_IDS.includes(provider);
}

export function assertValidActiveProvider(provider) {
  if (!IMAGE_PROVIDER_IDS.includes(provider)) {
    throw new Error(`active_provider must be one of: ${IMAGE_PROVIDER_IDS.join(', ')}`);
  }
}

export function assertValidCredentialProvider(provider) {
  if (!isCredentialProvider(provider)) {
    throw new Error(`provider must be one of: ${CREDENTIAL_PROVIDER_IDS.join(', ')}`);
  }
}

/**
 * UI / docs: common image model ids per provider (not enforced server-side).
 *
 * Other strong options (not first-class in this app yet): **Stability AI** (Stable Diffusion),
 * **Replicate** (many hosted models), **Amazon Bedrock** (Titan / SD). Integrate those via
 * **`external_http`** (custom gateway) or extend credentials + adapters in a follow-up migration.
 */
export const SUGGESTED_IMAGE_MODELS = {
  openai: ['dall-e-3', 'dall-e-2', 'gpt-image-1'],
  google: ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001', 'imagen-4.0-ultra-generate-001'],
  grok: ['grok-imagine-image'],
};
