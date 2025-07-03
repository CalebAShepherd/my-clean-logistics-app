import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all purchase orders with filtering
 */
export async function fetchPurchaseOrders(token, filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/purchase-orders?${queryString}` : `${API_URL}/purchase-orders`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase orders: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single purchase order by ID
 */
export async function fetchPurchaseOrder(token, id) {
  const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase order: ${res.status}`);
  return res.json();
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(token, data) {
  const res = await fetch(`${API_URL}/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating purchase order: ${res.status}`);
  return res.json();
}

/**
 * Update an existing purchase order
 */
export async function updatePurchaseOrder(token, id, data) {
  const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating purchase order: ${res.status}`);
  return res.json();
}

/**
 * Approve a purchase order
 */
export async function approvePurchaseOrder(token, id, approvedBy, comments = '') {
  const res = await fetch(`${API_URL}/purchase-orders/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approvedBy, comments }),
  });
  if (!res.ok) throw new Error(`Error approving purchase order: ${res.status}`);
  return res.json();
}

/**
 * Send purchase order to supplier
 */
export async function sendPurchaseOrder(token, id, sentBy, emailMessage = '') {
  const res = await fetch(`${API_URL}/purchase-orders/${id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sentBy, emailMessage }),
  });
  if (!res.ok) throw new Error(`Error sending purchase order: ${res.status}`);
  return res.json();
}

/**
 * Delete a purchase order
 */
export async function deletePurchaseOrder(token, id) {
  const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting purchase order: ${res.status}`);
} 