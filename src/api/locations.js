import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch all locations, optionally filtered by warehouseId
 */
export async function fetchLocations(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching locations: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single location by ID
 */
export async function fetchLocation(token, id) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching location: ${res.status}`);
  return res.json();
}

/**
 * Create a new location
 */
export async function createLocation(token, data) {
  const res = await fetch(`${API_URL}/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating location: ${res.status}`);
  return res.json();
}

/**
 * Update location by ID
 */
export async function updateLocation(token, id, data) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating location: ${res.status}`);
  return res.json();
}

/**
 * Delete a location by ID
 */
export async function deleteLocation(token, id) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting location: ${res.status}`);
} 