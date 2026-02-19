import api from '../lib/api';

export const getClients = async ({ page = 1, limit = 10, search = '' }) => {
    const response = await api.get('/customers', {
        params: { page, limit, search },
    });
    return response.data;
};

export const getClient = async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
};

export const createClient = async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
};

export const updateClient = async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
};

export const deleteClient = async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
};
