import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all warehouses
 */
export async function fetchWarehouses(token) {
  const res = await fetch(`${API_URL}/warehouses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching warehouses: ${res.status}`);
  return res.json();
}

export const warehousesAPI = {
  async getWarehouses(params = {}) {
    const response = await apiClient.get('/warehouses', { params });
    return response.data;
  },

  async getWarehouse(id) {
    const response = await apiClient.get(`/warehouses/${id}`);
    return response.data;
  },

  async createWarehouse(warehouseData) {
    const response = await apiClient.post('/warehouses', warehouseData);
    return response.data;
  },

  async updateWarehouse(id, warehouseData) {
    const response = await apiClient.put(`/warehouses/${id}`, warehouseData);
    return response.data;
  },

  async deleteWarehouse(id) {
    const response = await apiClient.delete(`/warehouses/${id}`);
    return response.data;
  }
};

export default warehousesAPI; 