import { supabaseAdmin } from '../config/supabase.js';
import { assertValidActiveProvider, CREDENTIAL_PROVIDER_IDS } from '../config/imageProviders.js';

const SETTINGS_ID = 'default';
const CACHE_TTL_MS = 60_000;

/** @type {{ payload: { active_provider: string, provider_models: Record<string, string> } | null, loadedAt: number }} */
let cache = { payload: null, loadedAt: 0 };

export function invalidateImageGenerationSettingsCache() {
  cache = { payload: null, loadedAt: 0 };
}

function asObject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...raw };
}

/**
 * Only allow model entries for credential-backed providers.
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
export function sanitizeProviderModels(raw) {
  const src = asObject(raw);
  const out = {};
  for (const key of CREDENTIAL_PROVIDER_IDS) {
    const v = src[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.trim();
  }
  return out;
}

/** Merge PATCH for provider_models: empty string removes key; omitted keys unchanged. */
export function mergeProviderModelPatch(current, patchRaw) {
  const cur = { ...sanitizeProviderModels(current) };
  if (patchRaw == null || typeof patchRaw !== 'object') return cur;
  for (const key of CREDENTIAL_PROVIDER_IDS) {
    if (!Object.prototype.hasOwnProperty.call(patchRaw, key)) continue;
    const v = patchRaw[key];
    if (v == null || (typeof v === 'string' && !String(v).trim())) delete cur[key];
    else cur[key] = String(v).trim();
  }
  return cur;
}

/**
 * Cached row subset for generation runtime.
 */
export async function getCachedImageGenerationRuntime() {
  const now = Date.now();
  if (cache.payload && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.payload;
  }

  const { data, error } = await supabaseAdmin
    .from('image_generation_settings')
    .select('active_provider, provider_models')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;

  const active = data?.active_provider || 'mock';
  const provider_models = sanitizeProviderModels(data?.provider_models);

  const payload = { active_provider: active, provider_models };
  cache = { payload, loadedAt: now };
  return payload;
}

export async function getActiveProviderCached() {
  const r = await getCachedImageGenerationRuntime();
  return r.active_provider;
}

/**
 * Model id for a credential provider, or null to use env/default in adapters.
 * @param {string} provider
 */
export async function getModelForProviderCached(provider) {
  const r = await getCachedImageGenerationRuntime();
  return r.provider_models[provider] || null;
}

export async function getImageGenerationSettings() {
  const { data, error } = await supabaseAdmin
    .from('image_generation_settings')
    .select('id, active_provider, provider_models, updated_at')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      id: SETTINGS_ID,
      active_provider: 'mock',
      provider_models: { openai: 'dall-e-3' },
      updated_at: null,
    };
  }
  return {
    ...data,
    provider_models: sanitizeProviderModels(data.provider_models),
  };
}

/**
 * @param {{ active_provider?: string, provider_models?: Record<string, string> }} patch
 */
export async function updateImageGenerationSettings(patch) {
  const hasActive = patch.active_provider != null && String(patch.active_provider).trim() !== '';
  const hasModels = patch.provider_models != null && typeof patch.provider_models === 'object';

  if (!hasActive && !hasModels) {
    throw new Error('Provide active_provider and/or provider_models');
  }

  const current = await getImageGenerationSettings();
  const nextActive = hasActive ? String(patch.active_provider).trim() : current.active_provider;
  assertValidActiveProvider(nextActive);

  const currentModels = sanitizeProviderModels(current.provider_models);
  const mergedModels = hasModels ? mergeProviderModelPatch(currentModels, patch.provider_models) : currentModels;

  const { data, error } = await supabaseAdmin
    .from('image_generation_settings')
    .upsert(
      {
        id: SETTINGS_ID,
        active_provider: nextActive,
        provider_models: mergedModels,
      },
      { onConflict: 'id' }
    )
    .select('id, active_provider, provider_models, updated_at')
    .single();

  if (error) throw error;
  invalidateImageGenerationSettingsCache();
  return data;
}

/** @deprecated Use updateImageGenerationSettings */
export async function setActiveProvider(activeProvider) {
  return updateImageGenerationSettings({ active_provider: activeProvider });
}
