import { supabaseAdmin } from '../config/supabase.js';
import {
  getCustomerCampaigns,
  getCustomerCampaignById,
  createCustomerCampaign,
  updateCustomerCampaign,
  deleteCustomerCampaign,
  cloneCampaign,
} from '../services/campaignService.js';
import {
  saveGeneratedImage,
  getAssets,
  getAssetById,
  getDashboardStats,
  updateAsset,
} from '../services/assetService.js';
import { buildPrompt, generateImage } from '../services/imageGenerationService.js';
import { getPromptParts } from '../services/promptService.js';
import { getCampaignOptions } from '../services/campaignOptionsService.js';

/* ─────────────────────────────────────────────
   Profile
   ───────────────────────────────────────────── */

export async function getProfileHandler(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, username, business_name, logo, contact_number, address, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateProfileHandler(req, res) {
  try {
    const allowed = ['full_name', 'username', 'business_name', 'logo', 'contact_number', 'address'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Dashboard
   ───────────────────────────────────────────── */

export async function getDashboardHandler(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Campaigns
   ───────────────────────────────────────────── */

export async function listCampaignsHandler(req, res) {
  try {
    console.log(req.user.id, ':USER ID');
    const { type, page, limit, search } = req.query;
    const result = await getCustomerCampaigns({ userId: req.user.id, type, page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getCampaignHandler(req, res) {
  try {
    const campaign = await getCustomerCampaignById(req.params.id, req.user.id);
    res.json({ success: true, data: campaign });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function createCampaignHandler(req, res) {
  try {
    const campaign = await createCustomerCampaign(req.user.id, req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateCampaignHandler(req, res) {
  try {
    const campaign = await updateCustomerCampaign(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: campaign });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deleteCampaignHandler(req, res) {
  try {
    await deleteCustomerCampaign(req.params.id, req.user.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function cloneCampaignHandler(req, res) {
  try {
    const cloned = await cloneCampaign(req.params.id, req.user.id);
    res.status(201).json({ success: true, data: cloned });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Image Generation
   ───────────────────────────────────────────── */

/**
 * POST /api/customer/generate
 * Body: campaignId?, basePrompt?, name?, visualStyle?, aspectRatio?, mood?,
 *       modelEnabled?, genderFocus? — all optional except you typically send
 *       basePrompt and/or campaignId for meaningful output.
 */
export async function generateImageHandler(req, res) {
  try {
    const {
      campaignId,
      basePrompt = '',
      name: assetName,
      visualStyle,
      aspectRatio,
      mood,
      modelEnabled,
      genderFocus,
    } = req.body;

    let finalVisualStyle = visualStyle;
    let finalAspectRatio = aspectRatio ?? '1:1';
    let finalMood = mood;
    let finalModelEnabled = modelEnabled ?? false;
    let finalGenderFocus = genderFocus ?? 'neutral';
    let promptParts = [];
    let resolvedCampaignId = campaignId || null;

    let customSections = [];

    // If campaignId provided, load campaign settings as defaults
    if (campaignId) {
      const campaign = await getCustomerCampaignById(campaignId, req.user.id);
      finalVisualStyle = finalVisualStyle ?? campaign.visual_style;
      finalAspectRatio = aspectRatio ?? campaign.aspect_ratio ?? '1:1';
      finalMood = finalMood ?? campaign.mood;
      finalModelEnabled = modelEnabled ?? campaign.model_enabled ?? false;
      finalGenderFocus = genderFocus ?? campaign.gender_focus ?? 'neutral';
      resolvedCampaignId = campaign.id;
      customSections = Array.isArray(campaign.custom_sections) ? campaign.custom_sections : [];

      // Load prompt parts if campaign has a product type
      if (campaign.product_type_id) {
        const parts = await getPromptParts(campaign.product_type_id);
        promptParts = (parts || []).map((p) => p.content);
      }
    }

    // Build the final prompt
    const finalPrompt = buildPrompt({
      basePrompt,
      visualStyle: finalVisualStyle,
      mood: finalMood,
      modelEnabled: finalModelEnabled,
      genderFocus: finalGenderFocus,
      promptParts,
      customSections,
    });

    // Call the generation service
    const result = await generateImage({
      prompt: finalPrompt,
      visualStyle: finalVisualStyle,
      aspectRatio: finalAspectRatio,
      mood: finalMood,
      modelEnabled: finalModelEnabled,
      genderFocus: finalGenderFocus,
    });

    // Persist the generated image
    const asset = await saveGeneratedImage({
      userId: req.user.id,
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

    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Assets
   ───────────────────────────────────────────── */

export async function listAssetsHandler(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await getAssets({ userId: req.user.id, page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAssetHandler(req, res) {
  try {
    const asset = await getAssetById(req.params.id, req.user.id);
    res.json({ success: true, data: asset });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function patchAssetHandler(req, res) {
  try {
    const { name, isLiked } = req.body;
    const asset = await updateAsset(req.params.id, req.user.id, { name, isLiked });
    res.json({ success: true, data: asset });
  } catch (err) {
    const status = err.message.includes('not found')
      ? 404
      : err.message.includes('No valid')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Campaign Config Options (customer read-only)
   ───────────────────────────────────────────── */

/**
 * GET /api/customer/campaign-options?product_type_id=<uuid>
 *
 * Returns option groups resolved for the given product type.
 * Falls back to global defaults when no type-specific override exists.
 */
export async function getCampaignOptionsHandler(req, res) {
  try {
    const { product_type_id } = req.query;
    const data = await getCampaignOptions(product_type_id || null);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Product Types (customer read-only)
   ───────────────────────────────────────────── */

export async function getProductTypesHandler(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('product_types')
      .select('id, name, template, sort_order')
      .eq('user_id', req.user.id)
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
