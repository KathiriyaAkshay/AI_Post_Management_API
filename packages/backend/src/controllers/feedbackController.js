import {
  createCustomerFeedback,
  listFeedbackForUser,
  getFeedbackForUser,
  updateFeedbackForUser,
  deleteFeedbackForUser,
  listAllFeedbackAdmin,
  getFeedbackAdmin,
  updateFeedbackAdmin,
  deleteFeedbackAdmin,
} from '../services/feedbackService.js';
import { assertRequiredFeedbackPayload } from '../validators/profileFeedback.js';

function httpStatus(err, fallback = 500) {
  if (err?.statusCode === 400 || err?.statusCode === 404) return err.statusCode;
  return fallback;
}

/* ─── Customer API (JWT subject owns rows) ─── */

export async function createCustomerFeedbackHandler(req, res) {
  try {
    const raw = req.body?.payload !== undefined ? req.body.payload : req.body;
    assertRequiredFeedbackPayload(raw);
    const row = await createCustomerFeedback(req.user.id, raw);
    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res.status(httpStatus(err, 500)).json({ success: false, error: err.message });
  }
}

export async function listCustomerFeedbackHandler(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await listFeedbackForUser(req.user.id, { page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getCustomerFeedbackHandler(req, res) {
  try {
    const row = await getFeedbackForUser(req.user.id, req.params.id);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(httpStatus(err, 404)).json({ success: false, error: err.message });
  }
}

export async function updateCustomerFeedbackHandler(req, res) {
  try {
    const raw = req.body?.payload !== undefined ? req.body.payload : req.body;
    assertRequiredFeedbackPayload(raw);
    const row = await updateFeedbackForUser(req.user.id, req.params.id, raw);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(httpStatus(err, 500)).json({ success: false, error: err.message });
  }
}

export async function deleteCustomerFeedbackHandler(req, res) {
  try {
    await deleteFeedbackForUser(req.user.id, req.params.id);
    return res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) {
    return res.status(httpStatus(err, 404)).json({ success: false, error: err.message });
  }
}

/* ─── Admin API ─── */

export async function listAdminFeedbackHandler(req, res) {
  try {
    const { page, limit, user_id } = req.query;
    const result = await listAllFeedbackAdmin({ page, limit, user_id: user_id || null });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAdminFeedbackHandler(req, res) {
  try {
    const row = await getFeedbackAdmin(req.params.id);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(httpStatus(err, 404)).json({ success: false, error: err.message });
  }
}

export async function updateAdminFeedbackHandler(req, res) {
  try {
    const raw = req.body?.payload !== undefined ? req.body.payload : req.body;
    assertRequiredFeedbackPayload(raw);
    const row = await updateFeedbackAdmin(req.params.id, raw);
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(httpStatus(err, 500)).json({ success: false, error: err.message });
  }
}

export async function deleteAdminFeedbackHandler(req, res) {
  try {
    await deleteFeedbackAdmin(req.params.id);
    return res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) {
    return res.status(httpStatus(err, 404)).json({ success: false, error: err.message });
  }
}
