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