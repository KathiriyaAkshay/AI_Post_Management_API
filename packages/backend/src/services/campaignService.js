import { supabaseAdmin } from '../config/supabase.js';

/* ─────────────────────────────────────────────
   Admin: Prebuilt Campaign Management
   ───────────────────────────────────────────── */

/**
 * List all prebuilt campaigns (admin use).
 */
export async function getPrebuiltCampaigns({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('is_prebuilt', true)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get a single prebuilt campaign by ID (admin use).
 */
export async function getPrebuiltCampaignById(id) {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('is_prebuilt', true)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Prebuilt campaign not found');
  return data;
}

/**
 * Create a new prebuilt campaign (admin use).
 */
export async function createPrebuiltCampaign(adminId, fields) {
  const {
    name,
    description,
    visualStyle,
    aspectRatio,
    mood,
    modelEnabled,
    genderFocus,
    status,
    productReferenceUrl,
    thumbnailUrl,
    productTypeId,
  } = fields;

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      user_id: null,
      created_by: adminId,
      is_prebuilt: true,
      name,
      description,
      visual_style: visualStyle || 'photorealistic',
      aspect_ratio: aspectRatio || '1:1',
      mood: mood || null,
      model_enabled: modelEnabled ?? false,
      gender_focus: genderFocus || 'neutral',
      status: status || 'draft',
      product_reference_url: productReferenceUrl || null,
      thumbnail_url: thumbnailUrl || null,
      product_type_id: productTypeId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a prebuilt campaign (admin use).
 */
export async function updatePrebuiltCampaign(id, fields) {
  const allowed = [
    'name', 'description', 'visual_style', 'aspect_ratio', 'mood',
    'model_enabled', 'gender_focus', 'status',
    'product_reference_url', 'thumbnail_url', 'product_type_id',
  ];

  const fieldMap = {
    name: 'name',
    description: 'description',
    visualStyle: 'visual_style',
    aspectRatio: 'aspect_ratio',
    mood: 'mood',
    modelEnabled: 'model_enabled',
    genderFocus: 'gender_focus',
    status: 'status',
    productReferenceUrl: 'product_reference_url',
    thumbnailUrl: 'thumbnail_url',
    productTypeId: 'product_type_id',
  };

  const updates = {};
  for (const [camelKey, dbKey] of Object.entries(fieldMap)) {
    if (fields[camelKey] !== undefined) updates[dbKey] = fields[camelKey];
  }

  if (Object.keys(updates).length === 0) throw new Error('No valid fields to update');

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('is_prebuilt', true)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a prebuilt campaign (admin use).
 */
export async function deletePrebuiltCampaign(id) {
  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('is_prebuilt', true);

  if (error) throw error;
  return true;
}

/* ─────────────────────────────────────────────
   Customer: Own + Prebuilt Campaign Access
   ───────────────────────────────────────────── */

/**
 * Get campaigns for a customer.
 * type: 'all' | 'prebuilt' | 'mine'
 */
export async function getCustomerCampaigns({ userId, type = 'all', page = 1, limit = 20, search = '' } = {}) {
  console.log(userId, type, page, limit, search, ':PARAMS');
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (type === 'prebuilt') {
    query = query.eq('is_prebuilt', true);
  } else if (type === 'mine') {
    query = query.eq('user_id', userId).eq('is_prebuilt', false);
  } else {
    // all: customer's own + all prebuilt
    query = query.or(`user_id.eq.${userId},is_prebuilt.eq.true`);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error, count } = await query;
  console.log(data, error, ':DATA ERROR');
  if (error) throw error;

  return {
    data,
    meta: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get a single campaign by ID for a customer.
 * Allows reading own campaigns and any prebuilt campaign.
 */
export async function getCustomerCampaignById(id, userId) {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .or(`user_id.eq.${userId},is_prebuilt.eq.true`)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Campaign not found');
  return data;
}

/**
 * Create a new campaign owned by a customer.
 */
export async function createCustomerCampaign(userId, fields) {
  const {
    name,
    description,
    visualStyle,
    aspectRatio,
    mood,
    modelEnabled,
    genderFocus,
    status,
    productReferenceUrl,
    thumbnailUrl,
    productTypeId,
    customSections,
  } = fields;

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      user_id: userId,
      is_prebuilt: false,
      name,
      description,
      visual_style: visualStyle || 'photorealistic',
      aspect_ratio: aspectRatio || '1:1',
      mood: mood || null,
      model_enabled: modelEnabled ?? false,
      gender_focus: genderFocus || 'neutral',
      status: status || 'draft',
      product_reference_url: productReferenceUrl || null,
      thumbnail_url: thumbnailUrl || null,
      product_type_id: productTypeId || null,
      custom_sections: Array.isArray(customSections) ? customSections : [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a customer's own campaign.
 */
export async function updateCustomerCampaign(id, userId, fields) {
  const fieldMap = {
    name: 'name',
    description: 'description',
    visualStyle: 'visual_style',
    aspectRatio: 'aspect_ratio',
    mood: 'mood',
    modelEnabled: 'model_enabled',
    genderFocus: 'gender_focus',
    status: 'status',
    productReferenceUrl: 'product_reference_url',
    thumbnailUrl: 'thumbnail_url',
    productTypeId: 'product_type_id',
    customSections: 'custom_sections',
  };

  const updates = {};
  for (const [camelKey, dbKey] of Object.entries(fieldMap)) {
    if (fields[camelKey] !== undefined) updates[dbKey] = fields[camelKey];
  }

  if (Object.keys(updates).length === 0) throw new Error('No valid fields to update');

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('is_prebuilt', false)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Campaign not found or not owned by user');
  return data;
}

/**
 * Delete a customer's own campaign.
 */
export async function deleteCustomerCampaign(id, userId) {
  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .eq('is_prebuilt', false);

  if (error) throw error;
  return true;
}

/**
 * Clone a prebuilt campaign into a customer's workspace.
 * Copies all settings; sets is_prebuilt=false, user_id=customer, cloned_from=source ID.
 */
export async function cloneCampaign(sourceId, userId) {
  // Fetch source (must be prebuilt)
  const { data: source, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', sourceId)
    .eq('is_prebuilt', true)
    .single();

  if (fetchError || !source) throw new Error('Prebuilt campaign not found');

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      user_id: userId,
      is_prebuilt: false,
      cloned_from: sourceId,
      name: `${source.name} (Copy)`,
      description: source.description,
      visual_style: source.visual_style,
      aspect_ratio: source.aspect_ratio,
      mood: source.mood,
      model_enabled: source.model_enabled,
      gender_focus: source.gender_focus,
      status: 'draft',
      product_reference_url: source.product_reference_url,
      thumbnail_url: source.thumbnail_url,
      product_type_id: source.product_type_id,
      custom_sections: source.custom_sections || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
