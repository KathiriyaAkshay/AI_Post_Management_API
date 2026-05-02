import { supabaseAdmin } from '../config/supabase.js';

export async function insertGenerationJob(userId, payload) {
  const { data, error } = await supabaseAdmin
    .from('generation_jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      payload: payload || {},
    })
    .select('id, status')
    .single();

  if (error) throw error;
  return data;
}

export async function updateGenerationJob(jobId, patch) {
  const { data, error } = await supabaseAdmin
    .from('generation_jobs')
    .update(patch)
    .eq('id', jobId)
    .select('id, status, asset_id, error_message')
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} jobId
 * @param {string} userId
 */
export async function getGenerationJobForUser(jobId, userId) {
  const { data, error } = await supabaseAdmin
    .from('generation_jobs')
    .select('id, status, asset_id, error_message, created_at, updated_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
