import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch all inventory items
 */
export async function fetchInventoryItems(token) {
  const res = await fetch(`${API_URL}/inventory-items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching inventory items: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single inventory item by ID
 */
export async function fetchInventoryItem(token, id) {
  const res = await fetch(`${API_URL}/inventory-items/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching inventory item: ${res.status}`);
  return res.json();
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(token, data) {
  const res = await fetch(`${API_URL}/inventory-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating inventory item: ${res.status}`);
  return res.json();
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(token, id, data) {
  const res = await fetch(`${API_URL}/inventory-items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating inventory item: ${res.status}`);
  return res.json();
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(token, id) {
  const res = await fetch(`${API_URL}/inventory-items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting inventory item: ${res.status}`);
}