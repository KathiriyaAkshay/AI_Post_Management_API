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
  getAssets,
  getAssetById,
  getDashboardStats,
  updateAsset,
} from '../services/assetService.js';
import { getCampaignOptions } from '../services/campaignOptionsService.js';
import { isAsyncImageGenerationEnabled } from '../config/generationConfig.js';
import { insertGenerationJob, updateGenerationJob, getGenerationJobForUser } from '../services/generationJobService.js';
import { enqueueImageGeneration } from '../queues/imageGenerationQueue.js';
import { executeCustomerImageGeneration } from '../services/customerGenerationService.js';

/* ─────────────────────────────────────────────
   Profile
   ───────────────────────────────────────────── */

export async function getProfileHandler(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, username, business_name, logo, logo_position, business_locations, contact_number, address, role, created_at')
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
    const allowed = [
      'full_name',
      'username',
      'business_name',
      'logo',
      'logo_position',
      'business_locations',
      'contact_number',
      'address',
    ];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.business_locations !== undefined && !Array.isArray(updates.business_locations)) {
      return res.status(400).json({ success: false, error: 'business_locations must be an array' });
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
 * Body: campaignId?, basePrompt?, productReferenceUrl?, name?, visualStyle?, aspectRatio?, mood?,
 *       modelEnabled?, genderFocus? — all optional; with campaignId, campaign
 *       description is merged into the scene prompt when basePrompt is absent or combined when both are set.
 *       productReferenceUrl: per-user product image; required for prebuilt campaigns to attach a reference (template URL is ignored).
 */
export async function generateImageHandler(req, res) {
  try {
    if (isAsyncImageGenerationEnabled()) {
      console.log('ASYNC IMAGE GENERATION ENABLED');
      const job = await insertGenerationJob(req.user.id, req.body);
      try {
        await enqueueImageGeneration({ jobId: job.id, userId: req.user.id, body: req.body });
      } catch (queueErr) {
        await updateGenerationJob(job.id, {
          status: 'failed',
          error_message: queueErr?.message || 'Queue error',
        });
        return res.status(503).json({
          success: false,
          error: 'Generation queue temporarily unavailable',
        });
      }
      return res.status(202).json({
        success: true,
        data: { jobId: job.id, status: 'pending' },
      });
    }

    const asset = await executeCustomerImageGeneration(req.user.id, req.body);
    return res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/customer/generation-jobs/:jobId
 * Poll async job status when WebSocket events were missed (e.g. client connected after job finished).
 */
export async function getGenerationJobHandler(req, res) {
  try {
    const job = await getGenerationJobForUser(req.params.jobId, req.user.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    let asset = null;
    if (job.status === 'completed' && job.asset_id) {
      try {
        asset = await getAssetById(job.asset_id, req.user.id);
      } catch {
        asset = null;
      }
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        asset,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ─────────────────────────────────────────────
   Assets
   ───────────────────────────────────────────── */

function parseListPagination(query) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const raw = parseInt(String(query.limit ?? '20'), 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : 20));
  const search = String(query.search ?? '').trim();
  return { page, limit, search };
}

export async function listAssetsHandler(req, res) {
  try {
    const { page, limit, search } = parseListPagination(req.query);
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
