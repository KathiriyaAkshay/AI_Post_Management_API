/**
 * Normalized image generation context (shared contract for provider adapters).
 *
 * @typedef {'text' | 'reference'} GenerationMode
 * @typedef {Object} ImageGenerationParams
 * @property {string} prompt
 * @property {string} [visualStyle]
 * @property {string} [aspectRatio]
 * @property {string} [mood]
 * @property {boolean} [modelEnabled]
 * @property {string} [genderFocus]
 * @property {string} [logoUrl]
 * @property {string} [logoPosition]
 * @property {string} [productReferenceUrl]
 * @property {GenerationMode} [generationMode] — set by {@link attachGenerationMode} before routing
 * @property {string} [apiKey] — injected by runtime for credential providers
 * @property {string|null} [model] — injected by runtime
 */

/**
 * Whether the request should prefer a reference-image capable path (URLs present).
 * @param {{ productReferenceUrl?: string, logoUrl?: string }} p
 * @returns {GenerationMode}
 */
export function deriveGenerationMode({ productReferenceUrl, logoUrl } = {}) {
  const pr =
    typeof productReferenceUrl === 'string' && productReferenceUrl.trim() ? productReferenceUrl.trim() : '';
  const lg = typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : '';
  if (pr || lg) return 'reference';
  return 'text';
}

/**
 * Mutates a shallow copy is unnecessary — attaches `generationMode` on the object passed from `generateImage`.
 * @param {ImageGenerationParams} params
 * @returns {ImageGenerationParams}
 */
export function attachGenerationMode(params) {
  if (!params || typeof params !== 'object') return params;
  params.generationMode = deriveGenerationMode({
    productReferenceUrl: params.productReferenceUrl,
    logoUrl: params.logoUrl,
  });
  return params;
}
