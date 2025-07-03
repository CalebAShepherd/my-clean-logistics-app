import apiClient from '../apiClient';

const base = '/crm/tasks';

export const fetchTasks = () => apiClient.get(base);
export const fetchTask = (id) => apiClient.get(`${base}/${id}`);
export const createTask = (data) => apiClient.post(base, data);
export const updateTask = (id, data) => apiClient.put(`${base}/${id}`, data);
export const deleteTask = (id) => apiClient.delete(`${base}/${id}`); 