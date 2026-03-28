import api from '../lib/api';

export const getCampaigns = (params) =>
  api.get('/admin/campaigns', { params }).then((r) => r.data);

export const getCampaign = (id) =>
  api.get(`/admin/campaigns/${id}`).then((r) => r.data);

export const createCampaign = (data) =>
  api.post('/admin/campaigns', data).then((r) => r.data);

export const updateCampaign = (id, data) =>
  api.put(`/admin/campaigns/${id}`, data).then((r) => r.data);

export const deleteCampaign = (id) =>
  api.delete(`/admin/campaigns/${id}`).then((r) => r.data);
