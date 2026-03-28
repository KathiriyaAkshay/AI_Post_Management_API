import {
  listOptions,
  getOptionById,
  createOption,
  updateOption,
  deleteOption,
  reorderOptions,
  getCampaignOptions,
} from '../services/campaignOptionsService.js';

export async function listOptionsHandler(req, res) {
  try {
    const { product_type_id, option_type, include_global } = req.query;
    const data = await listOptions({
      productTypeId: product_type_id,
      optionType: option_type,
      includeGlobal: include_global !== 'false',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getOptionHandler(req, res) {
  try {
    const data = await getOptionById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function createOptionHandler(req, res) {
  try {
    const data = await createOption(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function updateOptionHandler(req, res) {
  try {
    const data = await updateOption(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('No valid') || err.message.includes('Invalid') ? 400
      : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deleteOptionHandler(req, res) {
  try {
    await deleteOption(req.params.id);
    res.json({ success: true, message: 'Option deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function reorderOptionsHandler(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }
    await reorderOptions(items);
    res.json({ success: true, message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Preview endpoint: returns resolved options for a given product type (same as customer endpoint)
export async function previewOptionsHandler(req, res) {
  try {
    const { product_type_id } = req.query;
    const data = await getCampaignOptions(product_type_id || null);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
