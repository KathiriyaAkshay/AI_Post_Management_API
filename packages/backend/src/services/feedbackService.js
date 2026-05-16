import { supabaseAdmin } from '../config/supabase.js';
import { assertRequiredFeedbackPayload } from '../validators/profileFeedback.js';

function parsePageLimit(page, limit, defaultLimit = 20) {
  const safeLimit = Math.min(100, Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit));
  const safePage = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const offset = (safePage - 1) * safeLimit;
  return { safePage, safeLimit, offset };
}

const ADMIN_FEEDBACK_SELECT =
  'id, user_id, payload, created_at, updated_at, profiles(email, username, business_name)';

/**
 * @param {string} userId
 * @param {object} payload JSON object or array
 */
export async function createCustomerFeedback(userId, payload) {
  assertRequiredFeedbackPayload(payload);

  const { data, error } = await supabaseAdmin
    .from('customer_feedback')
    .insert({ user_id: userId, payload })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} userId
 */
export async function listFeedbackForUser(userId, { page = 1, limit = 20 } = {}) {
  const { safePage, safeLimit, offset } = parsePageLimit(page, limit);

  const { data, error, count } = await supabaseAdmin
    .from('customer_feedback')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (error) throw error;

  return {
    data: data ?? [],
    meta: {
      total: count ?? 0,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil((count ?? 0) / safeLimit),
    },
  };
}

/**
 * @param {string} userId
 * @param {string} feedbackId
 */
export async function getFeedbackForUser(userId, feedbackId) {
  const { data, error } = await supabaseAdmin
    .from('customer_feedback')
    .select('*')
    .eq('id', feedbackId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
}

/**
 * @param {string} userId
 * @param {string} feedbackId
 * @param {object} payload
 */
export async function updateFeedbackForUser(userId, feedbackId, payload) {
  assertRequiredFeedbackPayload(payload);

  const { data, error } = await supabaseAdmin
    .from('customer_feedback')
    .update({ payload })
    .eq('id', feedbackId)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  if (!data?.length) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return data[0];
}

/**
 * @param {string} userId
 * @param {string} feedbackId
 */
export async function deleteFeedbackForUser(userId, feedbackId) {
  const { error, count } = await supabaseAdmin
    .from('customer_feedback')
    .delete({ count: 'exact' })
    .eq('id', feedbackId)
    .eq('user_id', userId);

  if (error) throw error;
  if (!count) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
}

/**
 * Admin: paginated list with optional customer filter
 */
export async function listAllFeedbackAdmin({ page = 1, limit = 20, user_id: userIdFilter = null } = {}) {
  const { safePage, safeLimit, offset } = parsePageLimit(page, limit);

  let query = supabaseAdmin
    .from('customer_feedback')
    .select(ADMIN_FEEDBACK_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (userIdFilter) {
    query = query.eq('user_id', userIdFilter);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    meta: {
      total: count ?? 0,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil((count ?? 0) / safeLimit),
    },
  };
}

/**
 * @param {string} feedbackId
 */
export async function getFeedbackAdmin(feedbackId) {
  const { data, error } = await supabaseAdmin
    .from('customer_feedback')
    .select(ADMIN_FEEDBACK_SELECT)
    .eq('id', feedbackId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
}

/**
 * @param {string} feedbackId
 * @param {object} payload
 */
export async function updateFeedbackAdmin(feedbackId, payload) {
  assertRequiredFeedbackPayload(payload);

  const { data, error } = await supabaseAdmin
    .from('customer_feedback')
    .update({ payload })
    .eq('id', feedbackId)
    .select();

  if (error) throw error;
  if (!data?.length) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return data[0];
}

/**
 * @param {string} feedbackId
 */
export async function deleteFeedbackAdmin(feedbackId) {
  const { error, count } = await supabaseAdmin
    .from('customer_feedback')
    .delete({ count: 'exact' })
    .eq('id', feedbackId);

  if (error) throw error;
  if (!count) {
    const err = new Error('Feedback not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
}
