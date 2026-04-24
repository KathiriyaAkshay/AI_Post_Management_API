import { getCachedImageGenerationRuntime, getModelForProviderCached } from './imageGenerationSettingsService.js';
import { getDecryptedApiKey } from './imageProviderCredentialsService.js';
import { getImageProviderRunner } from './imageProviders/providerRegistry.js';

/**
 * Injects credential-backed fields for a provider and runs the registered adapter.
 *
 * @param {string} active
 * @param {object} params — same shape as `generateImage` in imageGenerationService
 */
async function runCredentialProvider(active, params) {
  if (active === 'openai') {
    const apiKey = await getDecryptedApiKey('openai');
    const model =
      (await getModelForProviderCached('openai')) ||
      process.env.OPENAI_IMAGE_MODEL?.trim() ||
      'dall-e-3';
    return getImageProviderRunner('openai')({ ...params, apiKey, model });
  }
  if (active === 'google') {
    const apiKey = await getDecryptedApiKey('google');
    const model = (await getModelForProviderCached('google')) || process.env.GOOGLE_IMAGE_MODEL?.trim() || null;
    return getImageProviderRunner('google')({ ...params, apiKey, model });
  }
  if (active === 'grok') {
    const apiKey = await getDecryptedApiKey('grok');
    const model = (await getModelForProviderCached('grok')) || process.env.GROK_IMAGE_MODEL?.trim() || null;
    return getImageProviderRunner('grok')({ ...params, apiKey, model });
  }
  return getImageProviderRunner('mock')(params);
}

/**
 * Runs image generation for the **active_provider** in `image_generation_settings`
 * (cached). Falls back to **mock** if settings cannot be read (e.g. migration not applied).
 *
 * Adapters are registered in `imageProviders/providerRegistry.js` for easier testing
 * and future per-provider capability routing.
 *
 * @param {object} params — same shape as `generateImage` in imageGenerationService
 */
export async function generateWithResolvedProvider(params) {
  let active = 'mock';
  try {
    const rt = await getCachedImageGenerationRuntime();
    active = rt.active_provider;
  } catch (err) {
    console.warn('[imageProviderRuntime] could not read image_generation_settings, using mock:', err?.message || err);
  }

  switch (active) {
    case 'mock':
      console.log(" Active : ", active)
      console.log(" Params : ", params)
      return getImageProviderRunner('mock')(params);
    case 'external_http':
      console.log("=================")
      console.log("🚀 ~ generateWithResolvedProvider ~ active:", active)
      console.log("=================")
      console.log("🚀 ~ generateWithResolvedProvider ~ params:", params)
      console.log("=================")
      return getImageProviderRunner('external_http')(params);
    case 'openai':
    case 'google':
    case 'grok':
      console.log("=================")
      console.log("🚀 ~ generateWithResolvedProvider ~ active:", active)
      console.log("=================")
      console.log("🚀 ~ generateWithResolvedProvider ~ params:", params)
      console.log("=================")
      return runCredentialProvider(active, params);
    default:
      return getImageProviderRunner('mock')(params);
  }
}
