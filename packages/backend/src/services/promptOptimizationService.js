import { getPromptOptimizerSettingsCached } from './imageGenerationSettingsService.js';
import { getPromptOptimizerRunner } from './promptOptimizers/providerRegistry.js';

function withTimeout(promise, timeoutMs) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Prompt optimization timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * @param {{ prompt: string, context?: object }} params
 * @returns {Promise<{
 *   optimizedPrompt: string,
 *   originalPrompt: string,
 *   usedOptimizer: boolean,
 *   fallbackUsed: boolean,
 *   provider: string | null,
 *   model: string | null,
 *   latencyMs: number,
 *   errorMessage: string | null,
 * }>}
 */
export async function optimizePromptBestEffort({ prompt, context = {} }) {
  const settings = await getPromptOptimizerSettingsCached();
  console.log("🚀 ~ optimizePromptBestEffort ~ settings:", settings)
  const originalPrompt = String(prompt || '');

  if (!settings?.enabled) {
    return {
      optimizedPrompt: originalPrompt,
      originalPrompt,
      usedOptimizer: false,
      fallbackUsed: false,
      provider: null,
      model: null,
      latencyMs: 0,
      errorMessage: null,
    };
  }

  const runner = getPromptOptimizerRunner(settings.provider);
  if (!runner) {
    const msg = `Prompt optimizer provider not supported: ${settings.provider}`;
    if (settings.policy === 'required') throw new Error(msg);
    return {
      optimizedPrompt: originalPrompt,
      originalPrompt,
      usedOptimizer: false,
      fallbackUsed: true,
      provider: settings.provider,
      model: settings.model,
      latencyMs: 0,
      errorMessage: msg,
    };
  }

  const started = Date.now();
  try {
    const optimizedPrompt = await withTimeout(
      runner({
        prompt: originalPrompt,
        model: settings.model,
        systemTemplate: settings.system_template,
        temperature: settings.temperature,
        maxTokens: settings.max_tokens,
        context,
      }),
      settings.timeout_ms
    );
    return {
      optimizedPrompt,
      originalPrompt,
      usedOptimizer: true,
      fallbackUsed: false,
      provider: settings.provider,
      model: settings.model,
      latencyMs: Date.now() - started,
      errorMessage: null,
    };
  } catch (err) {
    const msg = err?.message || 'Prompt optimization failed';
    if (settings.policy === 'required') {
      throw new Error(msg);
    }
    console.warn('[promptOptimization] fallback to original prompt:', msg);
    return {
      optimizedPrompt: originalPrompt,
      originalPrompt,
      usedOptimizer: false,
      fallbackUsed: true,
      provider: settings.provider,
      model: settings.model,
      latencyMs: Date.now() - started,
      errorMessage: msg,
    };
  }
}

