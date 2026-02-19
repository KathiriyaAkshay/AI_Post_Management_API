import { supabaseAdmin } from '../config/supabase.js';

/* --- Product Types --- */

export async function getProductTypes(userId) {
    const { data, error } = await supabaseAdmin
        .from('product_types')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
}

export async function createProductType(userId, { name, template, sortOrder }) {
    const { data, error } = await supabaseAdmin
        .from('product_types')
        .insert({
            user_id: userId,
            name,
            template,
            sort_order: sortOrder || 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateProductType(id, { name, template, sortOrder, active }) {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (template !== undefined) updates.template = template;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;
    if (active !== undefined) updates.active = active;

    const { data, error } = await supabaseAdmin
        .from('product_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteProductType(id) {
    const { error } = await supabaseAdmin
        .from('product_types')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

/* --- Prompt Parts --- */

export async function getPromptParts(productTypeId) {
    const { data, error } = await supabaseAdmin
        .from('prompt_parts')
        .select('*')
        .eq('product_type_id', productTypeId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
}

export async function addPromptPart(productTypeId, { content, orderIndex }) {
    const { data, error } = await supabaseAdmin
        .from('prompt_parts')
        .insert({
            product_type_id: productTypeId,
            content,
            order_index: orderIndex || 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updatePromptPart(id, { content, orderIndex }) {
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (orderIndex !== undefined) updates.order_index = orderIndex;

    const { data, error } = await supabaseAdmin
        .from('prompt_parts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deletePromptPart(id) {
    const { error } = await supabaseAdmin
        .from('prompt_parts')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

/* --- Logic --- */

export async function generatePromptPreview(productTypeId) {
    // 1. Get Product Type
    const { data: productType, error: ptError } = await supabaseAdmin
        .from('product_types')
        .select('*')
        .eq('id', productTypeId)
        .single();

    if (ptError) throw ptError;

    // 2. Get Parts
    const parts = await getPromptParts(productTypeId);

    // 3. Combine
    if (productType.template) {
        // Template logic: replace {1}, {2}, etc. with part content based on order (1-based index)
        let finalPrompt = productType.template;
        parts.forEach((part, index) => {
            const placeholder = `{${index + 1}}`;
            finalPrompt = finalPrompt.replace(placeholder, part.content);
        });
        return finalPrompt;
    } else {
        // Default logic: Join with spaces
        return parts.map((p) => p.content).join(' ');
    }
}
