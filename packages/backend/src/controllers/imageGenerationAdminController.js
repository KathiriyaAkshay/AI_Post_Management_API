import {
  getImageGenerationSettings,
  updateImageGenerationSettings,
} from '../services/imageGenerationSettingsService.js';
import {
  listImageProviderCredentialsMeta,
  upsertImageProviderCredential,
  deleteImageProviderCredential,
} from '../services/imageProviderCredentialsService.js';
import {
  IMAGE_PROVIDER_IDS,
  CREDENTIAL_PROVIDER_IDS,
  SUGGESTED_IMAGE_MODELS,
  PROMPT_OPTIMIZER_PROVIDER_IDS,
  SUGGESTED_PROMPT_OPTIMIZER_MODELS,
} from '../config/imageProviders.js';

export async function getImageGenerationSettingsHandler(req, res) {
  try {
    const data = await getImageGenerationSettings();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function putImageGenerationSettingsHandler(req, res) {
  try {
    const active = req.body?.active_provider ?? req.body?.activeProvider;
    const models = req.body?.provider_models ?? req.body?.providerModels;
    const promptOptimizer = req.body?.prompt_optimizer ?? req.body?.promptOptimizer;
    const generationRetry = req.body?.generation_retry ?? req.body?.generationRetry;
    const data = await updateImageGenerationSettings({
      active_provider: typeof active === 'string' ? active.trim() : undefined,
      provider_models: models,
      prompt_optimizer: promptOptimizer,
      generation_retry: generationRetry,
    });
    res.json({ success: true, data });
  } catch (err) {
    const status =
      err.message?.includes('active_provider must') || err.message?.startsWith('Provide ')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function listImageProviderCredentialsHandler(req, res) {
  try {
    const data = await listImageProviderCredentialsMeta();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function putImageProviderCredentialHandler(req, res) {
  try {
    const { provider } = req.params;
    if (!CREDENTIAL_PROVIDER_IDS.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `provider must be one of: ${CREDENTIAL_PROVIDER_IDS.join(', ')}`,
      });
    }
    const apiKey = req.body?.api_key ?? req.body?.apiKey;
    const label = req.body?.label ?? null;
    const data = await upsertImageProviderCredential(provider, apiKey, label);
    res.json({ success: true, data });
  } catch (err) {
    const status =
      err.message?.includes('apiKey') || err.message?.includes('PROVIDER_KEYS_MASTER_KEY')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deleteImageProviderCredentialHandler(req, res) {
  try {
    const { provider } = req.params;
    if (!CREDENTIAL_PROVIDER_IDS.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `provider must be one of: ${CREDENTIAL_PROVIDER_IDS.join(', ')}`,
      });
    }
    await deleteImageProviderCredential(provider);
    res.json({ success: true, message: 'Credential removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /admin/image-generation/providers — allowed provider ids (for UI). */
export function listImageProviderIdsHandler(req, res) {
  res.json({
    success: true,
    data: {
      active_provider_options: IMAGE_PROVIDER_IDS,
      credential_providers: CREDENTIAL_PROVIDER_IDS,
      suggested_image_models: SUGGESTED_IMAGE_MODELS,
        prompt_optimizer_providers: PROMPT_OPTIMIZER_PROVIDER_IDS,
        suggested_prompt_optimizer_models: SUGGESTED_PROMPT_OPTIMIZER_MODELS,
    },
  });
}
