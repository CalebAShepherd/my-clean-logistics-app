import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all purchase requisitions with filtering
 */
export async function fetchPurchaseRequisitions(token, filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/purchase-requisitions?${queryString}` : `${API_URL}/purchase-requisitions`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase requisitions: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single purchase requisition by ID
 */
export async function fetchPurchaseRequisition(token, id) {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase requisition: ${res.status}`);
  return res.json();
}

/**
 * Create a new purchase requisition
 */
export async function createPurchaseRequisition(token, data) {
  const res = await fetch(`${API_URL}/purchase-requisitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating purchase requisition: ${res.status}`);
  return res.json();
}

/**
 * Update an existing purchase requisition
 */
export async function updatePurchaseRequisition(token, id, data) {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating purchase requisition: ${res.status}`);
  return res.json();
}

/**
 * Approve a purchase requisition
 */
export async function approvePurchaseRequisition(token, id, approvedBy, comments = '') {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approvedBy, comments }),
  });
  if (!res.ok) throw new Error(`Error approving purchase requisition: ${res.status}`);
  return res.json();
}

/**
 * Reject a purchase requisition
 */
export async function rejectPurchaseRequisition(token, id, rejectedBy, rejectionReason) {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rejectedBy, rejectionReason }),
  });
  if (!res.ok) throw new Error(`Error rejecting purchase requisition: ${res.status}`);
  return res.json();
}

/**
 * Convert purchase requisition to purchase order
 */
export async function convertToPurchaseOrder(token, id, createdBy, supplierId, notes = '') {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}/convert-to-po`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ createdBy, supplierId, notes }),
  });
  if (!res.ok) throw new Error(`Error converting to purchase order: ${res.status}`);
  return res.json();
}

/**
 * Get pending approvals for a user
 */
export async function fetchPendingApprovals(token, userId) {
  const res = await fetch(`${API_URL}/purchase-requisitions/approvals/pending/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching pending approvals: ${res.status}`);
  return res.json();
}

/**
 * Delete a purchase requisition
 */
export async function deletePurchaseRequisition(token, id) {
  const res = await fetch(`${API_URL}/purchase-requisitions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting purchase requisition: ${res.status}`);
} 