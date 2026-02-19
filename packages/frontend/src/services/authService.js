import { api } from '../lib/api';

export const authService = {
  login: async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    return data;
  },
  signup: async (email, password, full_name) => {
    const { data } = await api.post('/auth/admin/signup', { email, password, full_name });
    return data;
  },
  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
  resetPassword: async (access_token, password) => {
    const { data } = await api.post('/auth/reset-password', { access_token, password });
    return data;
  },
  updatePassword: async (password) => {
    const { data } = await api.post('/auth/update-password', { password });
    return data;
  },
};
