import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all suppliers with optional filtering
 */
export async function fetchSuppliers(token, filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/suppliers?${queryString}` : `${API_URL}/suppliers`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching suppliers: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single supplier by ID
 */
export async function fetchSupplier(token, id) {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching supplier: ${res.status}`);
  return res.json();
}

/**
 * Create a new supplier
 */
export async function createSupplier(token, data) {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating supplier: ${res.status}`);
  return res.json();
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(token, id, data) {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating supplier: ${res.status}`);
  return res.json();
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(token, id) {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting supplier: ${res.status}`);
}

/**
 * Fetch supplier performance analytics
 */
export async function fetchSupplierPerformance(token, supplierId, period = '6months') {
  const res = await fetch(`${API_URL}/suppliers/${supplierId}/performance?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching supplier performance: ${res.status}`);
  return res.json();
}

/**
 * Update supplier status
 */
export async function updateSupplierStatus(token, id, status) {
  const res = await fetch(`${API_URL}/suppliers/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Error updating supplier status: ${res.status}`);
  return res.json();
}

/**
 * Fetch supplier analytics summary
 */
export async function fetchSupplierAnalytics(token, period = '12months') {
  const res = await fetch(`${API_URL}/suppliers/analytics?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching supplier analytics: ${res.status}`);
  return res.json();
} 