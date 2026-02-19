import * as promptService from '../services/promptService.js';

/* --- Product Types --- */

export async function getProductTypesHandler(req, res) {
    try {
        const { customerId } = req.params;
        const result = await promptService.getProductTypes(customerId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function createProductTypeHandler(req, res) {
    try {
        const { customerId } = req.params;
        const result = await promptService.createProductType(customerId, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function updateProductTypeHandler(req, res) {
    try {
        const { id } = req.params;
        const result = await promptService.updateProductType(id, req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function deleteProductTypeHandler(req, res) {
    try {
        const { id } = req.params;
        await promptService.deleteProductType(id);
        res.json({ success: true, message: 'Product type deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

/* --- Prompt Parts --- */

export async function getPromptPartsHandler(req, res) {
    try {
        const { productTypeId } = req.params;
        const result = await promptService.getPromptParts(productTypeId);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function addPromptPartHandler(req, res) {
    try {
        const { productTypeId } = req.params;
        const result = await promptService.addPromptPart(productTypeId, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function updatePromptPartHandler(req, res) {
    try {
        const { id } = req.params;
        const result = await promptService.updatePromptPart(id, req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function deletePromptPartHandler(req, res) {
    try {
        const { id } = req.params;
        await promptService.deletePromptPart(id);
        res.json({ success: true, message: 'Prompt part deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

export async function previewPromptHandler(req, res) {
    try {
        const { productTypeId } = req.params;
        const result = await promptService.generatePromptPreview(productTypeId);
        res.json({ success: true, data: { prompt: result } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}
