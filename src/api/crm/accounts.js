import apiClient from '../apiClient';

const base = '/crm/accounts';

export const fetchAccounts = () => apiClient.get(base);
export const fetchAccount = (id) => apiClient.get(`${base}/${id}`);
export const createAccount = (data) => apiClient.post(base, data);
export const updateAccount = (id, data) => apiClient.put(`${base}/${id}`, data);
export const deleteAccount = (id) => apiClient.delete(`${base}/${id}`); 