import { supabaseAdmin } from '../config/supabase.js';

const OPTION_TYPES = ['visual_style', 'aspect_ratio', 'mood', 'gender_focus'];

/* ─────────────────────────────────────────────
   Customer / shared: get options for a product type
   Falls back to global defaults per group when no
   product-type-specific override exists.
   ───────────────────────────────────────────── */

/**
 * Returns options grouped by type, resolved for a given product type.
 *
 * Resolution per group:
 *   1. Rows with product_type_id = productTypeId (when provided).
 *   2. Rows with product_type_id IS NULL (global defaults).
 *
 * @param {string|null} productTypeId
 * @returns {Promise<{
 *   visual_styles: object[],
 *   aspect_ratios: object[],
 *   moods: object[],
 *   gender_focus: object[],
 * }>}
 */
export async function getCampaignOptions(productTypeId = null) {
  // Fetch both global defaults and product-type overrides in one query
  let query = supabaseAdmin
    .from('campaign_config_options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (productTypeId) {
    // Get rows that are either global (NULL) or for this specific product type
    query = query.or(`product_type_id.is.null,product_type_id.eq.${productTypeId}`);
  } else {
    query = query.is('product_type_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group into buckets per option_type
  const buckets = {
    visual_style: [],
    aspect_ratio: [],
    mood: [],
    gender_focus: [],
  };

  for (const row of data) {
    if (buckets[row.option_type]) {
      buckets[row.option_type].push(row);
    }
  }

  // For each option_type: if there are product-type-specific rows, drop the globals
  const resolve = (type) => {
    const rows = buckets[type];
    const specific = rows.filter((r) => r.product_type_id !== null);
    return specific.length > 0 ? specific : rows.filter((r) => r.product_type_id === null);
  };

  return {
    visual_styles: resolve('visual_style'),
    aspect_ratios: resolve('aspect_ratio'),
    moods: resolve('mood'),
    gender_focus: resolve('gender_focus'),
  };
}

/* ─────────────────────────────────────────────
   Admin: CRUD for campaign_config_options
   ───────────────────────────────────────────── */

/**
 * List options with optional filters.
 */
export async function listOptions({ productTypeId, optionType, includeGlobal = true } = {}) {
  let query = supabaseAdmin
    .from('campaign_config_options')
    .select('*')
    .order('option_type', { ascending: true })
    .order('sort_order', { ascending: true });

  if (optionType) {
    query = query.eq('option_type', optionType);
  }

  if (productTypeId === 'global') {
    query = query.is('product_type_id', null);
  } else if (productTypeId) {
    if (includeGlobal) {
      query = query.or(`product_type_id.is.null,product_type_id.eq.${productTypeId}`);
    } else {
      query = query.eq('product_type_id', productTypeId);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get a single option by ID.
 */
export async function getOptionById(id) {
  const { data, error } = await supabaseAdmin
    .from('campaign_config_options')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Option not found');
  return data;
}

/**
 * Create a new config option.
 */
export async function createOption(fields) {
  const {
    productTypeId = null,
    optionType,
    value,
    label,
    description,
    icon,
    gradientFrom,
    gradientTo,
    isActive = true,
    sortOrder = 0,
  } = fields;

  if (!OPTION_TYPES.includes(optionType)) {
    throw new Error(`Invalid option_type. Must be one of: ${OPTION_TYPES.join(', ')}`);
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_config_options')
    .insert({
      product_type_id: productTypeId || null,
      option_type: optionType,
      value,
      label,
      description: description || null,
      icon: icon || null,
      gradient_from: gradientFrom || null,
      gradient_to: gradientTo || null,
      is_active: isActive,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing config option.
 */
export async function updateOption(id, fields) {
  const fieldMap = {
    productTypeId: 'product_type_id',
    optionType: 'option_type',
    value: 'value',
    label: 'label',
    description: 'description',
    icon: 'icon',
    gradientFrom: 'gradient_from',
    gradientTo: 'gradient_to',
    isActive: 'is_active',
    sortOrder: 'sort_order',
  };

  const updates = {};
  for (const [camelKey, dbKey] of Object.entries(fieldMap)) {
    if (fields[camelKey] !== undefined) updates[dbKey] = fields[camelKey];
  }

  if (Object.keys(updates).length === 0) throw new Error('No valid fields to update');

  if (updates.option_type && !OPTION_TYPES.includes(updates.option_type)) {
    throw new Error(`Invalid option_type. Must be one of: ${OPTION_TYPES.join(', ')}`);
  }

  const { data, error } = await supabaseAdmin
    .from('campaign_config_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a config option.
 */
export async function deleteOption(id) {
  const { error } = await supabaseAdmin
    .from('campaign_config_options')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Bulk reorder options within a group (updates sort_order).
 * @param {Array<{ id: string, sortOrder: number }>} items
 */
export async function reorderOptions(items) {
  const updates = items.map(({ id, sortOrder }) =>
    supabaseAdmin
      .from('campaign_config_options')
      .update({ sort_order: sortOrder })
      .eq('id', id)
  );

  await Promise.all(updates);
  return true;
}
