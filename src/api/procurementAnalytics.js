import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch procurement overview analytics
 */
export async function fetchProcurementOverview(token, period = '12months') {
  const res = await fetch(`${API_URL}/analytics/procurement-overview?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching procurement overview: ${res.status}`);
  return res.json();
}

/**
 * Fetch spend analysis
 */
export async function fetchSpendAnalysis(token, filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  
  const queryString = params.toString();
  const url = queryString ? `${API_URL}/analytics/procurement/spend?${queryString}` : `${API_URL}/analytics/procurement/spend`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching spend analysis: ${res.status}`);
  return res.json();
}

/**
 * Fetch supplier performance comparison
 */
export async function fetchSupplierPerformanceComparison(token, supplierIds = [], period = '6months') {
  const params = new URLSearchParams();
  params.append('period', period);
  supplierIds.forEach(id => params.append('supplierIds', id));
  
  const res = await fetch(`${API_URL}/analytics/procurement/supplier-performance?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching supplier performance comparison: ${res.status}`);
  return res.json();
}

/**
 * Fetch procurement trends
 */
export async function fetchProcurementTrends(token, months = 12) {
  const res = await fetch(`${API_URL}/analytics/procurement/trends?months=${months}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching procurement trends: ${res.status}`);
  return res.json();
}

/**
 * Fetch cost savings analysis
 */
export async function fetchCostSavingsAnalysis(token, period = '12months') {
  const res = await fetch(`${API_URL}/analytics/procurement/cost-savings?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching cost savings analysis: ${res.status}`);
  return res.json();
}

/**
 * Fetch purchase requisition analytics
 */
export async function fetchPurchaseRequisitionAnalytics(token, period = '6months') {
  const res = await fetch(`${API_URL}/analytics/procurement/requisitions?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase requisition analytics: ${res.status}`);
  return res.json();
}

/**
 * Fetch purchase order analytics
 */
export async function fetchPurchaseOrderAnalytics(token, period = '6months') {
  const res = await fetch(`${API_URL}/analytics/procurement/orders?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching purchase order analytics: ${res.status}`);
  return res.json();
} 