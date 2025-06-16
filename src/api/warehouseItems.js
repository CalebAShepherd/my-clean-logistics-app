import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch warehouse items, optionally filtered by warehouseId or itemId
 */
export async function fetchWarehouseItems(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
  if (filters.itemId) params.append('itemId', filters.itemId);
  if (filters.locationId) params.append('locationId', filters.locationId);
  const res = await fetch(`${API_URL}/warehouse-items?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching warehouse items: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single warehouse item by composite key
 */
export async function fetchWarehouseItem(token, warehouseId, itemId) {
  const res = await fetch(`${API_URL}/warehouse-items/${warehouseId}/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching warehouse item: ${res.status}`);
  return res.json();
}

/**
 * Create a new warehouse item record
 */
export async function createWarehouseItem(token, data) {
  const res = await fetch(`${API_URL}/warehouse-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error(`Error creating warehouse item: ${res.status}`);
  }
  if (!res.ok) {
    const msg = body.error || body.message || `Error creating warehouse item: ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Update an existing warehouse item record
 */
export async function updateWarehouseItem(token, warehouseId, itemId, data) {
  const locationId = data.locationId;
  const res = await fetch(`${API_URL}/warehouse-items/${warehouseId}/${itemId}/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error(`Error updating warehouse item: ${res.status}`);
  }
  if (!res.ok) {
    const msg = body.error || body.message || `Error updating warehouse item: ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Delete a warehouse item record
 */
export async function deleteWarehouseItem(token, warehouseId, itemId, locationId) {
  const res = await fetch(`${API_URL}/warehouse-items/${warehouseId}/${itemId}/${locationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting warehouse item: ${res.status}`);
} 