import { supabaseAdmin } from '../config/supabase.js';
import { assertValidActiveProvider, CREDENTIAL_PROVIDER_IDS } from '../config/imageProviders.js';

const SETTINGS_ID = 'default';
const CACHE_TTL_MS = 60_000;

const DEFAULT_PROMPT_OPTIMIZER = Object.freeze({
  enabled: true,
  policy: 'best_effort',
  provider: 'openai',
  model: 'gpt-5.4-nano',
  system_template:
    'You are an expert image prompt optimizer. Rewrite the user prompt to be clearer and more effective for modern image generation models. Preserve all hard constraints and factual details (brand/logo requirements, reference-image usage, safety-sensitive requirements). Do not add unrelated content. Return only the optimized prompt text, no markdown and no explanation.',
  timeout_ms: 2500,
  max_tokens: 800,
  temperature: 0.3,
});

const DEFAULT_GENERATION_RETRY = Object.freeze({
  enabled: true,
  max_attempts: 3,
  base_delay_ms: 1500,
  max_delay_ms: 12000,
  retry_on_statuses: [429, 500, 502, 503, 504],
  queue_attempts: 2,
  queue_backoff_ms: 5000,
});

/** @type {{ payload: { active_provider: string, provider_models: Record<string, string>, prompt_optimizer: object, generation_retry: object } | null, loadedAt: number }} */
let cache = { payload: null, loadedAt: 0 };

export function invalidateImageGenerationSettingsCache() {
  cache = { payload: null, loadedAt: 0 };
}

function asObject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...raw };
}

function asPositiveInt(raw, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.trunc(n);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function asBoolean(raw, fallback) {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

function asNumber(raw, fallback, { min = 0, max = 1 } = {}) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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

export function sanitizePromptOptimizer(raw) {
  const src = asObject(raw);
  const policy = String(src.policy || DEFAULT_PROMPT_OPTIMIZER.policy).trim();
  const provider = String(src.provider || DEFAULT_PROMPT_OPTIMIZER.provider).trim();
  const model = String(src.model || DEFAULT_PROMPT_OPTIMIZER.model).trim();
  return {
    enabled: asBoolean(src.enabled, DEFAULT_PROMPT_OPTIMIZER.enabled),
    policy: policy === 'required' ? 'required' : 'best_effort',
    provider: provider || DEFAULT_PROMPT_OPTIMIZER.provider,
    model: model || DEFAULT_PROMPT_OPTIMIZER.model,
    system_template:
      typeof src.system_template === 'string' && src.system_template.trim()
        ? src.system_template.trim()
        : DEFAULT_PROMPT_OPTIMIZER.system_template,
    timeout_ms: asPositiveInt(src.timeout_ms, DEFAULT_PROMPT_OPTIMIZER.timeout_ms, { min: 300, max: 15000 }),
    max_tokens: asPositiveInt(src.max_tokens, DEFAULT_PROMPT_OPTIMIZER.max_tokens, { min: 100, max: 4000 }),
    temperature: asNumber(src.temperature, DEFAULT_PROMPT_OPTIMIZER.temperature, { min: 0, max: 1 }),
  };
}

export function sanitizeGenerationRetry(raw) {
  const src = asObject(raw);
  const retryOnStatusesRaw = Array.isArray(src.retry_on_statuses)
    ? src.retry_on_statuses
    : DEFAULT_GENERATION_RETRY.retry_on_statuses;
  const retry_on_statuses = retryOnStatusesRaw
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 100 && n <= 599);
  return {
    enabled: asBoolean(src.enabled, DEFAULT_GENERATION_RETRY.enabled),
    max_attempts: asPositiveInt(src.max_attempts, DEFAULT_GENERATION_RETRY.max_attempts, { min: 1, max: 10 }),
    base_delay_ms: asPositiveInt(src.base_delay_ms, DEFAULT_GENERATION_RETRY.base_delay_ms, { min: 100, max: 60000 }),
    max_delay_ms: asPositiveInt(src.max_delay_ms, DEFAULT_GENERATION_RETRY.max_delay_ms, { min: 500, max: 120000 }),
    retry_on_statuses: retry_on_statuses.length ? retry_on_statuses : DEFAULT_GENERATION_RETRY.retry_on_statuses,
    queue_attempts: asPositiveInt(src.queue_attempts, DEFAULT_GENERATION_RETRY.queue_attempts, { min: 1, max: 10 }),
    queue_backoff_ms: asPositiveInt(src.queue_backoff_ms, DEFAULT_GENERATION_RETRY.queue_backoff_ms, { min: 500, max: 120000 }),
  };
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
    .select('active_provider, provider_models, prompt_optimizer, generation_retry')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;

  const active = data?.active_provider || 'mock';
  const provider_models = sanitizeProviderModels(data?.provider_models);
  const prompt_optimizer = sanitizePromptOptimizer(data?.prompt_optimizer);
  const generation_retry = sanitizeGenerationRetry(data?.generation_retry);

  const payload = { active_provider: active, provider_models, prompt_optimizer, generation_retry };
  cache = { payload, loadedAt: now };
  return payload;
}

export async function getActiveProviderCached() {
  const r = await getCachedImageGenerationRuntime();
  return r.active_provider;
}

export async function getPromptOptimizerSettingsCached() {
  const r = await getCachedImageGenerationRuntime();
  return r.prompt_optimizer;
}

export async function getGenerationRetrySettingsCached() {
  const r = await getCachedImageGenerationRuntime();
  return r.generation_retry;
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
    .select('id, active_provider, provider_models, prompt_optimizer, generation_retry, updated_at')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      id: SETTINGS_ID,
      active_provider: 'mock',
      provider_models: { openai: 'dall-e-3' },
      prompt_optimizer: { ...DEFAULT_PROMPT_OPTIMIZER },
      generation_retry: { ...DEFAULT_GENERATION_RETRY },
      updated_at: null,
    };
  }
  return {
    ...data,
    provider_models: sanitizeProviderModels(data.provider_models),
    prompt_optimizer: sanitizePromptOptimizer(data.prompt_optimizer),
    generation_retry: sanitizeGenerationRetry(data.generation_retry),
  };
}

/**
 * @param {{ active_provider?: string, provider_models?: Record<string, string>, prompt_optimizer?: object, generation_retry?: object }} patch
 */
export async function updateImageGenerationSettings(patch) {
  const hasActive = patch.active_provider != null && String(patch.active_provider).trim() !== '';
  const hasModels = patch.provider_models != null && typeof patch.provider_models === 'object';
  const hasPromptOptimizer = patch.prompt_optimizer != null && typeof patch.prompt_optimizer === 'object';
  const hasGenerationRetry = patch.generation_retry != null && typeof patch.generation_retry === 'object';

  if (!hasActive && !hasModels && !hasPromptOptimizer && !hasGenerationRetry) {
    throw new Error('Provide active_provider and/or provider_models and/or prompt_optimizer and/or generation_retry');
  }

  const current = await getImageGenerationSettings();
  const nextActive = hasActive ? String(patch.active_provider).trim() : current.active_provider;
  assertValidActiveProvider(nextActive);

  const currentModels = sanitizeProviderModels(current.provider_models);
  const mergedModels = hasModels ? mergeProviderModelPatch(currentModels, patch.provider_models) : currentModels;
  const mergedPromptOptimizer = hasPromptOptimizer
    ? sanitizePromptOptimizer({ ...current.prompt_optimizer, ...patch.prompt_optimizer })
    : sanitizePromptOptimizer(current.prompt_optimizer);
  const mergedGenerationRetry = hasGenerationRetry
    ? sanitizeGenerationRetry({ ...current.generation_retry, ...patch.generation_retry })
    : sanitizeGenerationRetry(current.generation_retry);

  const { data, error } = await supabaseAdmin
    .from('image_generation_settings')
    .upsert(
      {
        id: SETTINGS_ID,
        active_provider: nextActive,
        provider_models: mergedModels,
        prompt_optimizer: mergedPromptOptimizer,
        generation_retry: mergedGenerationRetry,
      },
      { onConflict: 'id' }
    )
    .select('id, active_provider, provider_models, prompt_optimizer, generation_retry, updated_at')
    .single();

  if (error) throw error;
  invalidateImageGenerationSettingsCache();
  return data;
}

/** @deprecated Use updateImageGenerationSettings */
export async function setActiveProvider(activeProvider) {
  return updateImageGenerationSettings({ active_provider: activeProvider });
}
