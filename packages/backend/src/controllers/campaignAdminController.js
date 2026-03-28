import {
  getPrebuiltCampaigns,
  getPrebuiltCampaignById,
  createPrebuiltCampaign,
  updatePrebuiltCampaign,
  deletePrebuiltCampaign,
} from '../services/campaignService.js';

export async function listPrebuiltCampaignsHandler(req, res) {
  try {
    const { page, limit, search } = req.query;
    const result = await getPrebuiltCampaigns({ page, limit, search });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPrebuiltCampaignHandler(req, res) {
  try {
    const { id } = req.params;
    const campaign = await getPrebuiltCampaignById(id);
    res.json({ success: true, data: campaign });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function createPrebuiltCampaignHandler(req, res) {
  try {
    const campaign = await createPrebuiltCampaign(req.user.id, req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updatePrebuiltCampaignHandler(req, res) {
  try {
    const { id } = req.params;
    const campaign = await updatePrebuiltCampaign(id, req.body);
    res.json({ success: true, data: campaign });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deletePrebuiltCampaignHandler(req, res) {
  try {
    const { id } = req.params;
    await deletePrebuiltCampaign(id);
    res.json({ success: true, message: 'Prebuilt campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
