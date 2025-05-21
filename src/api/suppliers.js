import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch all suppliers
 */
export async function fetchSuppliers(token) {
  const res = await fetch(`${API_URL}/suppliers`, {
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