import api from '../lib/api';

/* --- Product Types --- */

export const getProductTypes = async (customerId) => {
    const response = await api.get(`/prompts/customer/${customerId}/product-types`);
    return response.data;
};

export const createProductType = async (customerId, data) => {
    const response = await api.post(`/prompts/customer/${customerId}/product-types`, data);
    return response.data;
};

export const updateProductType = async (id, data) => {
    const response = await api.put(`/prompts/product-types/${id}`, data);
    return response.data;
};

export const deleteProductType = async (id) => {
    const response = await api.delete(`/prompts/product-types/${id}`);
    return response.data;
};

/* --- Prompt Parts --- */

export const getPromptParts = async (productTypeId) => {
    const response = await api.get(`/prompts/product-types/${productTypeId}/parts`);
    return response.data;
};

export const addPromptPart = async (productTypeId, data) => {
    const response = await api.post(`/prompts/product-types/${productTypeId}/parts`, data);
    return response.data;
};

export const updatePromptPart = async (id, data) => {
    const response = await api.put(`/prompts/parts/${id}`, data);
    return response.data;
};

export const deletePromptPart = async (id) => {
    const response = await api.delete(`/prompts/parts/${id}`);
    return response.data;
};

export const getPromptPreview = async (productTypeId) => {
    const response = await api.get(`/prompts/product-types/${productTypeId}/preview`);
    return response.data;
};
