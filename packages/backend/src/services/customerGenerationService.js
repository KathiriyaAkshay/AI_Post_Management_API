import { getCustomerCampaignById } from './campaignService.js';
import { getPromptParts } from './promptService.js';
import { buildPrompt, generateImage } from './imageGenerationService.js';
import { saveGeneratedImage } from './assetService.js';
import {
  getPlatformImageSystemPreamble,
  mergePlatformAndUserPrompt,
} from './platformImagePromptService.js';

/**
 * Resolves campaign + prompt parts, builds final prompt, generates image, persists asset.
 * Used by synchronous HTTP path and BullMQ worker.
 *
 * @param {string} userId - profiles.id / auth user id
 * @param {object} body - same shape as POST /api/customer/generate
 * @returns {Promise<object>} generated_images row (snake_case)
 */
export async function executeCustomerImageGeneration(userId, body) {
  const {
    campaignId,
    basePrompt = '',
    name: assetName,
    visualStyle,
    aspectRatio,
    mood,
    modelEnabled,
    genderFocus,
  } = body;

  let finalVisualStyle = visualStyle;
  let finalAspectRatio = aspectRatio ?? '1:1';
  let finalMood = mood;
  let finalModelEnabled = modelEnabled ?? false;
  let finalGenderFocus = genderFocus ?? 'neutral';
  let promptParts = [];
  let resolvedCampaignId = campaignId || null;
  let customSections = [];
  /** For optional per–product-type override of the same platform block_key (future); null if no campaign. */
  let productTypeIdForPlatform = null;

  if (campaignId) {
    const campaign = await getCustomerCampaignById(campaignId, userId);
    finalVisualStyle = finalVisualStyle ?? campaign.visual_style;
    finalAspectRatio = aspectRatio ?? campaign.aspect_ratio ?? '1:1';
    finalMood = finalMood ?? campaign.mood;
    finalModelEnabled = modelEnabled ?? campaign.model_enabled ?? false;
    finalGenderFocus = genderFocus ?? campaign.gender_focus ?? 'neutral';
    resolvedCampaignId = campaign.id;
    customSections = Array.isArray(campaign.custom_sections) ? campaign.custom_sections : [];
    productTypeIdForPlatform = campaign.product_type_id || null;

    if (campaign.product_type_id) {
      const parts = await getPromptParts(campaign.product_type_id);
      promptParts = (parts || []).map((p) => p.content);
    }
  }

  const userFacingPrompt = buildPrompt({
    basePrompt,
    visualStyle: finalVisualStyle,
    mood: finalMood,
    modelEnabled: finalModelEnabled,
    genderFocus: finalGenderFocus,
    promptParts,
    customSections,
  });

  const platformPreamble = await getPlatformImageSystemPreamble(productTypeIdForPlatform);
  const finalPrompt = mergePlatformAndUserPrompt(platformPreamble, userFacingPrompt);

  const result = await generateImage({
    prompt: finalPrompt,
    visualStyle: finalVisualStyle,
    aspectRatio: finalAspectRatio,
    mood: finalMood,
    modelEnabled: finalModelEnabled,
    genderFocus: finalGenderFocus,
  });

  const asset = await saveGeneratedImage({
    userId,
    campaignId: resolvedCampaignId,
    promptUsed: finalPrompt,
    imageUrl: result.imageUrl,
    width: result.width,
    height: result.height,
    format: result.format,
    colorSpace: 'sRGB',
      metadata: { generatedAt: new Date().toISOString() },
    name: typeof assetName === 'string' && assetName.trim() ? assetName.trim() : null,
  });

  return asset;
}
