import apiClient from '../apiClient';

const base = '/crm/leads';

export const fetchLeads = () => apiClient.get(base);
export const fetchLead = (id) => apiClient.get(`${base}/${id}`);
export const createLead = (data) => apiClient.post(base, data);
export const updateLead = (id, data) => apiClient.put(`${base}/${id}`, data);
export const deleteLead = (id) => apiClient.delete(`${base}/${id}`);
export const convertLead = (id) => apiClient.post(`${base}/${id}/convert`); 