import Constants from 'expo-constants';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch on-time vs late stats
 */
export async function fetchOnTimeLate(token, start, end) {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  const res = await fetch(`${API_URL}/api/analytics/deliveries?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching onTimeLate: ${res.status}`);
  return res.json();
}

/**
 * Fetch total completed count
 */
export async function fetchCompletedCount(token, start, end) {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  const res = await fetch(`${API_URL}/api/analytics/completed?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching completedCount: ${res.status}`);
  return res.json();
}

/**
 * Fetch count of shipments currently in transit
 */
export async function fetchInTransitCount(token) {
  const res = await fetch(`${API_URL}/api/analytics/in-transit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching in-transit count: ${res.status}`);
  return res.json();
}

/**
 * Fetch delivery volume trends
 * @param {'day'|'week'|'month'} period grouping
 */
export async function fetchDeliveryTrends(token, start, end, period = 'day') {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  if (period) params.append('period', period);
  const res = await fetch(`${API_URL}/api/analytics/trends?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching trends: ${res.status}`);
  return res.json();
}

/**
 * Fetch delivery volume forecast along with trends
 */
export async function fetchForecast(token, start, end, period = 'day', method = 'sma', window = 3) {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  if (period) params.append('period', period);
  if (method) params.append('method', method);
  if (window) params.append('window', window);
  const res = await fetch(`${API_URL}/api/analytics/deliveries/forecast?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching forecast: ${res.status}`);
  return res.json();
}

/**
 * Fetch delivery anomalies (transit times > sigma stddev above mean)
 */
export async function fetchDeliveryAnomalies(token, start, end, sigma = 2) {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  params.append('sigma', sigma);
  const res = await fetch(`${API_URL}/api/analytics/deliveries/anomalies?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching anomalies: ${res.status}`);
  return res.json();
}

/**
 * Fetch CRM dashboard data
 */
export async function fetchCRMDashboard(token) {
  const res = await fetch(`${API_URL}/api/analytics/crm/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching CRM dashboard: ${res.status}`);
  return res.json();
}

// Analytics API functions
export const getAnalytics = async (period = '7d') => {
  // ... existing code ...
} 