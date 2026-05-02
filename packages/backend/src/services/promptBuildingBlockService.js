import { supabaseAdmin } from '../config/supabase.js';

const CATEGORIES = ['system', 'style', 'composition', 'brand', 'safety', 'negative', 'other'];

/**
 * List blocks with optional filters (admin).
 */
export async function listPromptBlocks({ productTypeId, category, blockKey, includeGlobal = true } = {}) {
  let query = supabaseAdmin
    .from('prompt_building_blocks')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }
  if (blockKey) {
    query = query.eq('block_key', blockKey);
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
 * Resolved blocks for generation/agent: per block_key, product-type row wins over global.
 * @param {string|null} productTypeId
 * @param {string[]|null} categories - if set, only these categories
 * @returns {Array<{ id, block_key, category, title, content, sort_order, product_type_id }>}
 */
export async function resolvePromptBlocks({ productTypeId = null, categories = null } = {}) {
  let query = supabaseAdmin
    .from('prompt_building_blocks')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (productTypeId) {
    query = query.or(`product_type_id.is.null,product_type_id.eq.${productTypeId}`);
  } else {
    query = query.is('product_type_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  let rows = data || [];

  if (categories?.length) {
    const set = new Set(categories);
    rows = rows.filter((r) => set.has(r.category));
  }

  const globals = rows.filter((r) => r.product_type_id == null);
  const specifics = productTypeId
    ? rows.filter((r) => r.product_type_id && String(r.product_type_id) === String(productTypeId))
    : [];

  const byKey = new Map();
  for (const r of globals) {
    byKey.set(r.block_key, r);
  }
  for (const r of specifics) {
    byKey.set(r.block_key, r);
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

/**
 * Concatenate resolved block contents (e.g. inject into agent system message).
 */
export function joinResolvedBlockContents(blocks, { separator = '\n\n' } = {}) {
  return blocks.map((b) => b.content?.trim()).filter(Boolean).join(separator);
}

export async function getPromptBlockById(id) {
  const { data, error } = await supabaseAdmin
    .from('prompt_building_blocks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Prompt block not found');
  return data;
}

function validateBlockKey(key) {
  if (!key || typeof key !== 'string') throw new Error('block_key is required');
  const trimmed = key.trim();
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    throw new Error('block_key must be lowercase letters, numbers, and underscores only');
  }
  return trimmed;
}

function validateCategory(cat) {
  if (!cat) return 'other';
  if (!CATEGORIES.includes(cat)) {
    throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  return cat;
}

export async function createPromptBlock(fields) {
  const {
    productTypeId = null,
    blockKey,
    category = 'other',
    title = null,
    content,
    isActive = true,
    sortOrder = 0,
  } = fields;

  if (!content || typeof content !== 'string') {
    throw new Error('content is required');
  }

  const key = validateBlockKey(blockKey);
  const cat = validateCategory(category);

  const { data, error } = await supabaseAdmin
    .from('prompt_building_blocks')
    .insert({
      product_type_id: productTypeId || null,
      block_key: key,
      category: cat,
      title: title || null,
      content: content.trim(),
      is_active: isActive,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePromptBlock(id, fields) {
  const fieldMap = {
    productTypeId: 'product_type_id',
    blockKey: 'block_key',
    category: 'category',
    title: 'title',
    content: 'content',
    isActive: 'is_active',
    sortOrder: 'sort_order',
  };

  const updates = {};
  for (const [camel, dbKey] of Object.entries(fieldMap)) {
    if (fields[camel] !== undefined) updates[dbKey] = fields[camel];
  }

  if (updates.block_key !== undefined) {
    updates.block_key = validateBlockKey(updates.block_key);
  }
  if (updates.category !== undefined) {
    updates.category = validateCategory(updates.category);
  }
  if (updates.content !== undefined) {
    updates.content = String(updates.content).trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabaseAdmin
    .from('prompt_building_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Prompt block not found');
  return data;
}

export async function deletePromptBlock(id) {
  const { error } = await supabaseAdmin.from('prompt_building_blocks').delete().eq('id', id);
  if (error) throw error;
  return true;
}
