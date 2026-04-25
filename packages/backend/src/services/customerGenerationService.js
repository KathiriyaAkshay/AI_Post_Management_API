import { supabaseAdmin } from '../config/supabase.js';
import { getCustomerCampaignById } from './campaignService.js';
import { getPromptParts } from './promptService.js';
import { buildPrompt, generateImage } from './imageGenerationService.js';
import { saveGeneratedImage } from './assetService.js';
import { mirrorGeneratedImageToSupabase } from './generatedImageStorageService.js';
import {
  getPlatformImageSystemPreamble,
  mergePlatformAndUserPrompt,
} from './platformImagePromptService.js';
import { optimizePromptBestEffort } from './promptOptimizationService.js';

async function getProfileBrandingForGeneration(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('business_name, logo, logo_position')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return { brandName: null, logoUrl: null, logoPosition: 'auto' };
  const brandName = typeof data.business_name === 'string' && data.business_name.trim() ? data.business_name.trim() : null;
  const logoUrl = typeof data.logo === 'string' && data.logo.trim() ? data.logo.trim() : null;
  const allowedPositions = new Set([
    'auto',
    'top_left',
    'top_right',
    'top_center',
    'bottom_left',
    'bottom_right',
    'bottom_center',
    'center',
  ]);
  const logoPosition = allowedPositions.has(data.logo_position) ? data.logo_position : 'auto';
  return { brandName, logoUrl, logoPosition };
}

/**
 * Resolves campaign + prompt parts, builds final prompt, generates image, persists asset.
 * Used by synchronous HTTP path and BullMQ worker.
 *
 * @param {string} userId - profiles.id / auth user id
 * @param {object} body - same shape as POST /api/customer/generate (includes optional `productReferenceUrl`)
 * @returns {Promise<object>} generated_images row (snake_case)
 */
export async function executeCustomerImageGeneration(userId, body) {
  console.log('[generation] executeCustomerImageGeneration:start', {
    userId,
    campaignId: body?.campaignId || null,
    hasBasePrompt: Boolean(typeof body?.basePrompt === 'string' && body.basePrompt.trim()),
  });
  const {
    campaignId,
    basePrompt = '',
    name: assetName,
    visualStyle,
    aspectRatio,
    mood,
    modelEnabled,
    genderFocus,
    productReferenceUrl: productReferenceUrlFromBody,
  } = body;

  const bodyProductRef =
    typeof productReferenceUrlFromBody === 'string' && productReferenceUrlFromBody.trim()
      ? productReferenceUrlFromBody.trim()
      : null;

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
  let campaignRow = null;
  /** Per-generation product image URL: request wins; own campaigns may fall back to DB; prebuilt templates never use shared `product_reference_url`. */
  let productReferenceUrl = null;

  if (campaignId) {
    campaignRow = await getCustomerCampaignById(campaignId, userId);
    finalVisualStyle = finalVisualStyle ?? campaignRow.visual_style;
    finalAspectRatio = aspectRatio ?? campaignRow.aspect_ratio ?? '1:1';
    finalMood = finalMood ?? campaignRow.mood;
    finalModelEnabled = modelEnabled ?? campaignRow.model_enabled ?? false;
    finalGenderFocus = genderFocus ?? campaignRow.gender_focus ?? 'neutral';
    resolvedCampaignId = campaignRow.id;
    customSections = Array.isArray(campaignRow.custom_sections) ? campaignRow.custom_sections : [];
    productTypeIdForPlatform = campaignRow.product_type_id || null;

    let fromCampaignRow =
      typeof campaignRow.product_reference_url === 'string' && campaignRow.product_reference_url.trim()
        ? campaignRow.product_reference_url.trim()
        : null;
    if (campaignRow.is_prebuilt === true) {
      fromCampaignRow = null;
    }
    productReferenceUrl = bodyProductRef || fromCampaignRow;

    if (campaignRow.product_type_id) {
      const parts = await getPromptParts(campaignRow.product_type_id);
      promptParts = (parts || []).map((p) => p.content);
    }
  } else {
    productReferenceUrl = bodyProductRef;
  }

  const bodyBase = typeof basePrompt === 'string' ? basePrompt.trim() : '';
  const campaignDescription =
    campaignRow && typeof campaignRow.description === 'string' && campaignRow.description.trim()
      ? campaignRow.description.trim()
      : '';
  const effectiveBasePrompt = [campaignDescription, bodyBase].filter(Boolean).join('\n\n');

  const { brandName, logoUrl, logoPosition } = await getProfileBrandingForGeneration(userId);

  const userFacingPrompt = buildPrompt({
    basePrompt: effectiveBasePrompt,
    visualStyle: finalVisualStyle,
    mood: finalMood,
    modelEnabled: finalModelEnabled,
    genderFocus: finalGenderFocus,
    promptParts,
    customSections,
    brandName,
    logoUrl,
    logoPosition,
    productReferenceUrl,
  });
  console.log('[generation] prompt:userFacing:built', {
    userId,
    length: userFacingPrompt.length,
    hasProductReference: Boolean(productReferenceUrl),
    hasLogoReference: Boolean(logoUrl),
    logoPosition,
  });

  const platformPreamble = await getPlatformImageSystemPreamble(productTypeIdForPlatform);
  const mergedPrompt = mergePlatformAndUserPrompt(platformPreamble, userFacingPrompt);
  console.log('[generation] prompt:merged', {
    userId,
    length: mergedPrompt.length,
    hasPlatformPreamble: Boolean(platformPreamble),
  });
  const promptOptimization = await optimizePromptBestEffort({
    prompt: mergedPrompt,
    context: {
      userId,
      campaignId: resolvedCampaignId,
      providerHints: {
        visualStyle: finalVisualStyle,
        aspectRatio: finalAspectRatio,
      },
    },
  });
  const finalPrompt = promptOptimization.optimizedPrompt;
  console.log('[generation] prompt:optimized', {
    userId,
    usedOptimizer: promptOptimization.usedOptimizer,
    fallbackUsed: promptOptimization.fallbackUsed,
    provider: promptOptimization.provider,
    model: promptOptimization.model,
    originalLength: promptOptimization.originalPrompt.length,
    finalLength: finalPrompt.length,
    latencyMs: promptOptimization.latencyMs,
    errorMessage: promptOptimization.errorMessage || null,
  });

  const result = await generateImage({
    prompt: finalPrompt,
    visualStyle: finalVisualStyle,
    aspectRatio: finalAspectRatio,
    mood: finalMood,
    modelEnabled: finalModelEnabled,
    genderFocus: finalGenderFocus,
    logoUrl: logoUrl || undefined,
    logoPosition: logoPosition || undefined,
    productReferenceUrl: productReferenceUrl || undefined,
  });
  console.log('[generation] provider:result', {
    userId,
    provider: result?.metadata?.provider || null,
    model: result?.metadata?.model || null,
    generationMode: result?.metadata?.generationMode || null,
    width: result?.width || null,
    height: result?.height || null,
    format: result?.format || null,
  });

  const { publicUrl: persistedImageUrl, storagePath } = await mirrorGeneratedImageToSupabase(
    userId,
    result.imageUrl
  );
  console.log('[generation] storage:mirrored', {
    userId,
    hasStoragePath: Boolean(storagePath),
    persistedUrlHost: (() => {
      try {
        return new URL(persistedImageUrl).host;
      } catch {
        return null;
      }
    })(),
  });

  const asset = await saveGeneratedImage({
    userId,
    campaignId: resolvedCampaignId,
    promptUsed: finalPrompt,
    imageUrl: persistedImageUrl,
    width: result.width,
    height: result.height,
    format: result.format,
    colorSpace: 'sRGB',
    metadata: {
      generatedAt: new Date().toISOString(),
      ...(result.metadata && typeof result.metadata === 'object' ? result.metadata : {}),
      promptOptimization: {
        originalPrompt: promptOptimization.originalPrompt,
        optimizedPrompt: promptOptimization.optimizedPrompt,
        usedOptimizer: promptOptimization.usedOptimizer,
        fallbackUsed: promptOptimization.fallbackUsed,
        provider: promptOptimization.provider,
        model: promptOptimization.model,
        latencyMs: promptOptimization.latencyMs,
        ...(promptOptimization.errorMessage ? { errorMessage: promptOptimization.errorMessage } : {}),
      },
      logoPositionUsed: logoPosition,
      ...(storagePath ? { storagePath, mirroredToSupabase: true } : {}),
      // Keep only https provider URLs in DB; never store data: blobs (they mirror to `image_url` anyway).
      ...(persistedImageUrl !== result.imageUrl && result.imageUrl
        && !String(result.imageUrl).trim().toLowerCase().startsWith('data:')
        ? { originalProviderImageUrl: result.imageUrl }
        : {}),
    },
    name: typeof assetName === 'string' && assetName.trim() ? assetName.trim() : null,
    productReferenceInputUrl: bodyProductRef,
    productReferenceResolvedUrl: productReferenceUrl,
    brandLogoUrl: logoUrl,
  });
  console.log('[generation] executeCustomerImageGeneration:completed', {
    userId,
    assetId: asset?.id || null,
    campaignId: resolvedCampaignId,
  });

  return asset;
}
