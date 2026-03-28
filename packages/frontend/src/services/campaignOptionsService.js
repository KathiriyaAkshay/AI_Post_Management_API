import api from '../lib/api';

export const getOptions = (params) =>
  api.get('/admin/campaign-options', { params }).then((r) => r.data);

export const getOption = (id) =>
  api.get(`/admin/campaign-options/${id}`).then((r) => r.data);

export const previewOptions = (productTypeId) =>
  api.get('/admin/campaign-options/preview', {
    params: productTypeId ? { product_type_id: productTypeId } : {},
  }).then((r) => r.data);

export const createOption = (data) =>
  api.post('/admin/campaign-options', data).then((r) => r.data);

export const updateOption = (id, data) =>
  api.put(`/admin/campaign-options/${id}`, data).then((r) => r.data);

export const deleteOption = (id) =>
  api.delete(`/admin/campaign-options/${id}`).then((r) => r.data);

export const reorderOptions = (items) =>
  api.post('/admin/campaign-options/reorder', { items }).then((r) => r.data);
