import api from '../lib/api';

export const getImageGenerationProviderIds = () =>
  api.get('/admin/image-generation/providers').then((r) => r.data);

export const getImageGenerationSettings = () =>
  api.get('/admin/image-generation/settings').then((r) => r.data);

export const putImageGenerationSettings = (body) =>
  api.put('/admin/image-generation/settings', body).then((r) => r.data);

export const listImageProviderCredentials = () =>
  api.get('/admin/image-generation/credentials').then((r) => r.data);

export const putImageProviderCredential = (provider, body) =>
  api.put(`/admin/image-generation/credentials/${provider}`, body).then((r) => r.data);

export const deleteImageProviderCredential = (provider) =>
  api.delete(`/admin/image-generation/credentials/${provider}`).then((r) => r.data);
