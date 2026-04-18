import { getCachedImageGenerationRuntime, getModelForProviderCached } from './imageGenerationSettingsService.js';
import { getDecryptedApiKey } from './imageProviderCredentialsService.js';
import { generateWithMock } from './imageProviders/mockAdapter.js';
import { generateWithExternalHttp } from './imageProviders/externalHttpAdapter.js';
import { generateWithOpenAI } from './imageProviders/openaiAdapter.js';
import { generateWithGoogle } from './imageProviders/googleAdapter.js';
import { generateWithGrok } from './imageProviders/grokAdapter.js';

/**
 * Runs image generation for the **active_provider** in `image_generation_settings`
 * (cached). Falls back to **mock** if settings cannot be read (e.g. migration not applied).
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
      return generateWithMock(params);
    case 'external_http':
      return generateWithExternalHttp(params);
    case 'openai': {
      const apiKey = await getDecryptedApiKey('openai');
      const model =
        (await getModelForProviderCached('openai')) ||
        process.env.OPENAI_IMAGE_MODEL?.trim() ||
        'dall-e-3';
      return generateWithOpenAI({ ...params, apiKey, model });
    }
    case 'google': {
      const apiKey = await getDecryptedApiKey('google');
      const model = (await getModelForProviderCached('google')) || process.env.GOOGLE_IMAGE_MODEL?.trim() || null;
      return generateWithGoogle({ ...params, apiKey, model });
    }
    case 'grok': {
      const apiKey = await getDecryptedApiKey('grok');
      const model = (await getModelForProviderCached('grok')) || process.env.GROK_IMAGE_MODEL?.trim() || null;
      return generateWithGrok({ ...params, apiKey, model });
    }
    default:
      return generateWithMock(params);
  }
}
