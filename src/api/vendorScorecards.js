import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all vendor scorecards with filtering
 */
export async function fetchVendorScorecards(token, filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/vendor-scorecards?${queryString}` : `${API_URL}/vendor-scorecards`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching vendor scorecards: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single vendor scorecard by ID
 */
export async function fetchVendorScorecard(token, id) {
  const res = await fetch(`${API_URL}/vendor-scorecards/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching vendor scorecard: ${res.status}`);
  return res.json();
}

/**
 * Fetch scorecards for a specific supplier
 */
export async function fetchSupplierScorecards(token, supplierId) {
  const res = await fetch(`${API_URL}/vendor-scorecards/supplier/${supplierId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching supplier scorecards: ${res.status}`);
  return res.json();
}

/**
 * Create a new vendor scorecard
 */
export async function createVendorScorecard(token, data) {
  const res = await fetch(`${API_URL}/vendor-scorecards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error creating vendor scorecard: ${res.status}`);
  return res.json();
}

/**
 * Update an existing vendor scorecard
 */
export async function updateVendorScorecard(token, id, data) {
  const res = await fetch(`${API_URL}/vendor-scorecards/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating vendor scorecard: ${res.status}`);
  return res.json();
}

/**
 * Get vendor performance analytics
 */
export async function fetchVendorPerformanceAnalytics(token, supplierId, period = '6months') {
  const res = await fetch(`${API_URL}/vendor-scorecards/analytics/${supplierId}?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching vendor performance analytics: ${res.status}`);
  return res.json();
}

/**
 * Get vendor performance trends
 */
export async function fetchVendorPerformanceTrends(token, supplierId, months = 12) {
  const res = await fetch(`${API_URL}/vendor-scorecards/trends/${supplierId}?months=${months}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching vendor performance trends: ${res.status}`);
  return res.json();
}

/**
 * Get top performing vendors
 */
export async function fetchTopPerformingVendors(token, limit = 10) {
  const res = await fetch(`${API_URL}/vendor-scorecards/top-performers?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching top performing vendors: ${res.status}`);
  return res.json();
}

/**
 * Delete a vendor scorecard
 */
export async function deleteVendorScorecard(token, id) {
  const res = await fetch(`${API_URL}/vendor-scorecards/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting vendor scorecard: ${res.status}`);
} 