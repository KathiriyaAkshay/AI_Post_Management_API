/**
 * Image Generation Service
 *
 * - **Legacy:** `IMAGE_GENERATION_USE_EXTERNAL=true` + URL + key → HTTP gateway (unchanged precedence).
 * - **Default:** `image_generation_settings.active_provider` drives **mock**, **OpenAI**, **Google (Imagen)**, **Grok (Imagine)**, or **external_http** (env URL). Keys for OpenAI / Google / Grok come from encrypted DB credentials.
 *
 * Interface:
 *   generateImage(params) => Promise<{ imageUrl, width, height, format, promptUsed }>
 */

import { generateWithExternalHttp } from './imageProviders/externalHttpAdapter.js';
import { generateWithResolvedProvider } from './imageProviderRuntime.js';

/**
 * Legacy gateway: env-based, takes precedence over DB `active_provider` when enabled.
 */
export function shouldUseExternalImageGeneration() {
  const enabled = process.env.IMAGE_GENERATION_USE_EXTERNAL === 'true';
  const url = process.env.IMAGE_GENERATION_API_URL?.trim();
  return enabled && Boolean(url);
}

/**
 * @returns {Promise<{ imageUrl: string, width: number, height: number, format: string, promptUsed: string }>}
 */
export async function generateImage(params) {
  if (shouldUseExternalImageGeneration()) {
    return generateWithExternalHttp(params);
  }
  return generateWithResolvedProvider(params);
}

/**
 * Build the **user-facing** prompt string (no platform preamble). Customer generation
 * prepends the platform system block (`getPlatformImageSystemPreamble` in `platformImagePromptService.js`) before the provider call.
 *
 * Build the final prompt string from campaign parameters, prompt parts,
 * and user-defined custom sections.
 *
 * @param {object} params
 * @param {string}   params.basePrompt     - Free-text prompt from user
 * @param {string}   params.visualStyle    - e.g. 'photorealistic', 'cinematic'
 * @param {string}   params.mood           - e.g. 'golden_hour', 'vibrant'
 * @param {string}   params.aspectRatio    - e.g. '16:9'
 * @param {boolean}  params.modelEnabled   - Whether to include human model
 * @param {string}   params.genderFocus    - 'male' | 'female' | 'neutral'
 * @param {string[]} params.promptParts    - Prompt parts from the product type
 * @param {Array}    params.customSections - User-defined sections: [{ title, description, prompt_weight }]
 * @returns {string}
 */
export function buildPrompt({ basePrompt = '', visualStyle, mood, modelEnabled, genderFocus, promptParts = [], customSections = [] }) {
  const parts = [];

  if (basePrompt) parts.push(basePrompt);
  if (promptParts.length > 0) parts.push(promptParts.join(', '));
  if (visualStyle && visualStyle !== 'photorealistic') parts.push(visualStyle);
  if (mood) parts.push(mood);
  if (modelEnabled) {
    const genderLabel = genderFocus === 'male' ? 'male model' : genderFocus === 'female' ? 'female model' : 'model';
    parts.push(`featuring a ${genderLabel}`);
  }

  const weightOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...customSections].sort(
    (a, b) => (weightOrder[a.prompt_weight] ?? 1) - (weightOrder[b.prompt_weight] ?? 1)
  );
  for (const section of sorted) {
    if (section.description && section.description.trim()) {
      parts.push(section.description.trim());
    }
  }

  return parts.filter(Boolean).join(', ');
}
