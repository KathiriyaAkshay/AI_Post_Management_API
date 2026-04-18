import { resolvePromptBlocks } from './promptBuildingBlockService.js';

/**
 * Global block_key for the platform-wide image generation preamble (product_type_id NULL).
 * Optional per–product-type override: same block_key with a non-null product_type_id wins in resolvePromptBlocks.
 */
export const PLATFORM_IMAGE_SYSTEM_BLOCK_KEY = 'image_gen_platform_system';

/**
 * Returns the fixed “system” / platform preamble prepended to every customer image prompt
 * before calling the image provider. Does not depend on prompt_parts or campaign product_type_id;
 * product_type_id is only used to pick a scoped override of this same block_key when you add one later.
 *
 * Resolution order:
 * 1. Active `prompt_building_blocks` row for `image_gen_platform_system` (scoped wins over global).
 * 2. Else `IMAGE_GENERATION_SYSTEM_PROMPT` env (trimmed).
 * 3. Else empty string (user-only prompt).
 */
export async function getPlatformImageSystemPreamble(productTypeId = null) {
  const envFallback = process.env.IMAGE_GENERATION_SYSTEM_PROMPT?.trim() || '';

  try {
    const resolved = await resolvePromptBlocks({
      productTypeId: productTypeId || null,
      categories: ['system'],
    });
    const row = resolved.find((r) => r.block_key === PLATFORM_IMAGE_SYSTEM_BLOCK_KEY);
    const fromDb = row?.content?.trim();
    if (fromDb) return fromDb;
  } catch (err) {
    console.warn('[platformImagePrompt] resolvePromptBlocks:', err?.message || err);
  }

  return envFallback;
}

/**
 * Joins platform preamble and user-facing prompt for the model and for `prompt_used` storage.
 */
export function mergePlatformAndUserPrompt(platformPreamble, userPrompt) {
  const p = typeof platformPreamble === 'string' ? platformPreamble.trim() : '';
  const u = typeof userPrompt === 'string' ? userPrompt.trim() : '';
  if (p && u) return `${p}\n\n${u}`;
  return p || u || '';
}
