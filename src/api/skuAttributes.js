import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

export async function fetchSKUAttributes(token) {
  const res = await fetch(`${API_URL}/sku-attributes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching SKU attributes: ${res.status}`);
  return res.json();
}

export async function createSKUAttribute(token, data) {
  const res = await fetch(`${API_URL}/sku-attributes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating SKU attribute: ${res.status}`);
  return res.json();
}

export async function updateSKUAttribute(token, id, data) {
  const res = await fetch(`${API_URL}/sku-attributes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating SKU attribute: ${res.status}`);
  return res.json();
}

export async function deleteSKUAttribute(token, id) {
  const res = await fetch(`${API_URL}/sku-attributes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting SKU attribute: ${res.status}`);
} 