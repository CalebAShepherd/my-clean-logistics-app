import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

// Fetch all damage reports, optionally filtered
export async function fetchDamageReports(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
  if (filters.itemId) params.append('itemId', filters.itemId);
  const res = await fetch(`${API_URL}/damage-reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching reports: ${res.status}`);
  return res.json();
}

// Create a new damage report with optional photos
export async function createDamageReport(token, data, photos = []) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value != null) form.append(key, String(value));
  });
  photos.forEach((photo) => {
    form.append('photos', {
      uri: photo.uri,
      name: photo.name || 'photo.jpg',
      type: photo.type || 'image/jpeg',
    });
  });
  const res = await fetch(`${API_URL}/damage-reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Error creating report: ${res.status}`);
  }
  return res.json();
}

// Update an existing damage report, optionally adding photos
export async function updateDamageReport(token, id, data, photos = []) {
  const form = new FormData();
  form.append('id', id);
  Object.entries(data).forEach(([key, value]) => {
    if (value != null) form.append(key, String(value));
  });
  photos.forEach((photo) => {
    form.append('photos', {
      uri: photo.uri,
      name: photo.name || 'photo.jpg',
      type: photo.type || 'image/jpeg',
    });
  });
  const res = await fetch(`${API_URL}/damage-reports/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Error updating report: ${res.status}`);
  return res.json();
}

// Delete a damage report
export async function deleteDamageReport(token, id) {
  const res = await fetch(`${API_URL}/damage-reports/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting report: ${res.status}`);
} 