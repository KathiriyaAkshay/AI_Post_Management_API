import { supabaseAdmin } from '../config/supabase.js';

const DATA_URL_RE = /^data:/i;

/** List reads must not select `metadata` JSONB — old rows can hold multi‑MB base64; that I/O dominated latency before Node could strip it. */
const GENERATED_IMAGE_LIST_SELECT = [
  'id',
  'user_id',
  'campaign_id',
  'name',
  'is_liked',
  'prompt_used',
  'image_url',
  'file_size',
  'format',
  'width',
  'height',
  'color_space',
  'product_reference_input_url',
  'product_reference_resolved_url',
  'brand_logo_url',
  'created_at',
].join(', ');

const CUSTOMER_ASSET_LIST_EMBED = `${GENERATED_IMAGE_LIST_SELECT}, campaigns(id, name, is_prebuilt)`;
const ADMIN_ASSET_LIST_EMBED = `${GENERATED_IMAGE_LIST_SELECT}, campaigns(id, name)`;

/**
 * Strips `data:` (inline) image payloads from `metadata` for API and realtime JSON.
 * Use `image_url` on the row for the public image link; we never return multi‑MB blobs in fields.
 * @param {object|null|undefined} metadata
 * @returns {object}
 */
export function stripInlineImageDataFromMetadata(metadata) {
  if (metadata == null) return {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  const out = { ...metadata };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === 'string' && v.length > 0 && DATA_URL_RE.test(v.trim())) {
      delete out[key];
    }
  }
  return out;
}

/**
 * @param {object|undefined} row
 */
function assetForPublicResponse(row) {
  if (!row || typeof row !== 'object') return row;
  const raw = row.metadata;
  return {
    ...row,
    metadata: stripInlineImageDataFromMetadata(raw !== undefined && raw !== null ? raw : {}),
  };
}

/**
 * Save a generated image record to the database.
 */
export async function saveGeneratedImage({
  userId,
  campaignId,
  promptUsed,
  imageUrl,
  width,
  height,
  format,
  colorSpace,
  metadata,
  name = null,
  productReferenceInputUrl = null,
  productReferenceResolvedUrl = null,
  brandLogoUrl = null,
}) {
  const { data, error } = await supabaseAdmin
    .from('generated_images')
    .insert({
      user_id: userId,
      campaign_id: campaignId || null,
      prompt_used: promptUsed,
      image_url: imageUrl,
      width: width || null,
      height: height || null,
      format: format || 'PNG',
      color_space: colorSpace || 'sRGB',
      metadata: metadata || {},
      name: name || null,
      product_reference_input_url: productReferenceInputUrl || null,
      product_reference_resolved_url: productReferenceResolvedUrl || null,
      brand_logo_url: brandLogoUrl || null,
    })
    .select()
    .single();

  if (error) throw error;
  return assetForPublicResponse(data);
}

/**
 * Get paginated list of assets for a customer.
 */
export async function getAssets({ userId, page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('generated_images')
    .select(CUSTOMER_ASSET_LIST_EMBED, { count: 'exact' })
    .eq('user_id', userId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (search) {
    const q = String(search).replace(/,/g, ' ').trim();
    if (q) {
      query = query.or(`prompt_used.ilike.%${q}%,name.ilike.%${q}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data || []).map((row) => assetForPublicResponse(row));
  return {
    data: rows,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get a single asset by ID (must belong to customer).
 */
export async function getAssetById(id, userId) {
  const { data, error } = await supabaseAdmin
    .from('generated_images')
    .select('*, campaigns(id, name, is_prebuilt, visual_style, aspect_ratio, mood)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Asset not found');
  return assetForPublicResponse(data);
}

/**
 * Get dashboard stats for a customer.
 */
export async function getDashboardStats(userId) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
  const startOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();

  // Total images
  const { count: totalCount } = await supabaseAdmin
    .from('generated_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Customer-owned campaigns (excludes platform prebuilt templates)
  const { count: campaignCount } = await supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_prebuilt', false);

  // Yesterday
  const { count: yesterdayCount } = await supabaseAdmin
    .from('generated_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfYesterday)
    .lt('created_at', startOfToday);

  // This week
  const { count: weekCount } = await supabaseAdmin
    .from('generated_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfWeek);

  // Last 4 recent images
  const { data: recentImages } = await supabaseAdmin
    .from('generated_images')
    .select(
      'id, image_url, prompt_used, product_reference_input_url, product_reference_resolved_url, brand_logo_url, name, is_liked, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(4);

  // Chart data: last 30 days, daily counts
  const { data: chartRows } = await supabaseAdmin
    .from('generated_images')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', startOf30Days)
    .order('created_at', { ascending: true });

  // Aggregate by day
  const dailyCounts = {};
  (chartRows || []).forEach((row) => {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });

  // Fill all 30 days (even zeros)
  const chartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chartData.push({ date: key, count: dailyCounts[key] || 0 });
  }

  return {
    totalImages: totalCount || 0,
    totalCampaigns: campaignCount || 0,
    yesterdayImages: yesterdayCount || 0,
    weekImages: weekCount || 0,
    recentImages: recentImages || [],
    chartData,
  };
}

/**
 * Get all images for a customer's campaigns (admin view).
 */
export async function getAllAssets({ page = 1, limit = 20, search = '', userId = null } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('generated_images')
    .select(ADMIN_ASSET_LIST_EMBED, { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  if (search) {
    const q = String(search).replace(/,/g, ' ').trim();
    if (q) {
      query = query.or(`prompt_used.ilike.%${q}%,name.ilike.%${q}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data || []).map((row) => assetForPublicResponse(row));
  return {
    data: rows,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Update asset display name and/or like state (must belong to customer).
 */
export async function updateAsset(id, userId, { name, isLiked } = {}) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (isLiked !== undefined) updates.is_liked = Boolean(isLiked);

  if (Object.keys(updates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabaseAdmin
    .from('generated_images')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*, campaigns(id, name, is_prebuilt, visual_style, aspect_ratio, mood)')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Asset not found');
  return assetForPublicResponse(data);
}
