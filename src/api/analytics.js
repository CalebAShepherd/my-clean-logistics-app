import Constants from 'expo-constants';

const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

/**
 * Fetch on-time vs late stats
 */
export async function fetchOnTimeLate(token, start, end) {
  const params = new URLSearchParams();
  if (start) params.append('start', start.toISOString());
  if (end) params.append('end', end.toISOString());
  const res = await fetch(`${API_URL}/analytics/deliveries?${params}`, {
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
  const res = await fetch(`${API_URL}/analytics/completed?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching completedCount: ${res.status}`);
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
  const res = await fetch(`${API_URL}/analytics/trends?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching trends: ${res.status}`);
  return res.json();
} 