/**
 * Image Generation Service
 *
 * - **Legacy:** `IMAGE_GENERATION_USE_EXTERNAL=true` + URL + key → HTTP gateway (unchanged precedence).
 * - **Default:** `image_generation_settings.active_provider` drives **mock**, **OpenAI**, **Google (Imagen)**, **Grok (Imagine)**, or **external_http** (env URL). Keys for OpenAI / Google / Grok come from encrypted DB credentials.
 *
 * Interface:
 *   generateImage(params) => Promise<{ imageUrl, width, height, format, promptUsed, metadata? }>
 *
 * `attachGenerationMode` sets `params.generationMode` (`text` | `reference`) before routing.
 * OpenAI uses `/v1/images/edits` when `reference` and reference URLs exist; see `openaiAdapter.js`.
 */

import { generateWithExternalHttp } from './imageProviders/externalHttpAdapter.js';
import { generateWithResolvedProvider } from './imageProviderRuntime.js';
import { attachGenerationMode } from './generationContext.js';

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
  attachGenerationMode(params);
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
 * @param {string|null} [params.brandName] - profiles.business_name (optional)
 * @param {string|null} [params.logoUrl] - profiles.logo URL (text + external_http only; DALL-E 3 does not ingest images)
 * @param {string|null} [params.productReferenceUrl] - Resolved per request (body or own campaign row; prebuilt templates excluded)
 * @returns {string}
 */
export function buildPrompt({
  basePrompt = '',
  visualStyle,
  mood,
  modelEnabled,
  genderFocus,
  promptParts = [],
  customSections = [],
  brandName = null,
  logoUrl = null,
  productReferenceUrl = null,
}) {
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

  const bn = typeof brandName === 'string' ? brandName.trim() : '';
  const logo = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  const pref = typeof productReferenceUrl === 'string' ? productReferenceUrl.trim() : '';

  if (bn) {
    parts.push(`On-brand for business name: ${bn}.`);
    if (logo) {
      parts.push(
        'Treat the business name as contextual copy only; the definitive brand mark is the supplied logo reference image below — do not substitute plain typography or a fake sign for that artwork.'
      );
    }
  }

  if (logo && pref) {
    parts.push(
      'Reference images are ordered: (1) product / packaging inspiration — match subject, props, and styling. (2) official brand logo artwork — composite this logo visibly into the scene (corner, label area, or tasteful overlay), preserving its shapes, colors, and lettering as in the reference; do not redraw it as unrelated text.'
    );
  } else if (logo) {
    parts.push(
      'The supplied reference image is the official brand logo — place it clearly in the composition and preserve its design faithfully; do not invent a different logotype or replace it with styled text of the business name.'
    );
  }

  if (pref) {
    parts.push('Align subject and packaging with the campaign product reference where applicable.');
  }

  return parts.filter(Boolean).join(', ');
}
