import apiClient from '../apiClient';

const base = '/crm/tickets';

export const fetchTickets = () => apiClient.get(base);
export const fetchTicket = (id) => apiClient.get(`${base}/${id}`);
export const createTicket = (data) => apiClient.post(base, data);
export const updateTicket = (id, data) => apiClient.put(`${base}/${id}`, data);
export const deleteTicket = (id) => apiClient.delete(`${base}/${id}`); 