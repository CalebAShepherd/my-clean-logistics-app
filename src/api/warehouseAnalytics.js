import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch stock turnover (number of movements) grouped by period
 */
export async function fetchStockTurnover(token, period = 'day') {
  const res = await fetch(`${API_URL}/analytics/warehouse/turnover?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching stock turnover: ${res.status}`);
  return res.json();
}

/**
 * Fetch space usage metrics (e.g., total SKUs, total quantity)
 */
export async function fetchSpaceUsage(token) {
  const res = await fetch(`${API_URL}/analytics/warehouse/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching space usage: ${res.status}`);
  return res.json();
}

/**
 * Fetch receiving speed metrics (e.g., avg time between inbound logs)
 */
export async function fetchReceivingSpeed(token) {
  const res = await fetch(`${API_URL}/analytics/warehouse/receiving-speed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching receiving speed: ${res.status}`);
  return res.json();
}

/**
 * Fetch inventory aging buckets (0–30, 31–60, 61+ days)
 */
export async function fetchInventoryAging(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/analytics/warehouse/aging?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching inventory aging: ${res.status}`);
  return res.json();
}

/**
 * Fetch ABC analysis for SKUs
 */
export async function fetchABCAnalysis(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/analytics/warehouse/abc?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching ABC analysis: ${res.status}`);
  return res.json();
}

/**
 * Fetch slow-moving SKUs (low movement count)
 */
export async function fetchSlowMovers(token, warehouseId, days = 30, threshold = 1) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  params.append('days', days);
  params.append('threshold', threshold);
  const res = await fetch(`${API_URL}/analytics/warehouse/slow-movers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching slow movers: ${res.status}`);
  return res.json();
}

/**
 * Fetch warehouse daily reports, newest first
 */
export async function fetchWarehouseReports(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/analytics/warehouse/reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching warehouse reports: ${res.status}`);
  return res.json();
}

/**
 * Fetch rack utilization data for heatmap
 */
export async function fetchRackUtilization(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/analytics/warehouse/rack-utilization?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching rack utilization: ${res.status}`);
  return res.json();
} 