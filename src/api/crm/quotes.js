import apiClient from '../apiClient';

const base = '/crm/quotes';

export const fetchQuotes = () => apiClient.get(base);
export const fetchQuote = (id) => apiClient.get(`${base}/${id}`);
export const createQuote = (data) => apiClient.post(base, data);
export const updateQuote = (id, data) => apiClient.put(`${base}/${id}`, data);
export const deleteQuote = (id) => apiClient.delete(`${base}/${id}`); 