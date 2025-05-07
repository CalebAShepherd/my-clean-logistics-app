import Constants from 'expo-constants';

// Use the same network address fallback as frontend screens
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.73:3000';

/**
 * Fetch all routes (optionally filter by transporterId) from the backend.
 * @param {string} token - Bearer token for authorization
 * @param {string} [transporterId] - Optional transporter ID to filter
 */
export async function listRoutes(token, transporterId) {
  const url = transporterId ? `${API_URL}/routes?transporterId=${transporterId}` : `${API_URL}/routes`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Error fetching routes: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a single route by ID from the backend.
 * @param {string} token - Bearer token for authorization
 * @param {string} routeId - Route ID to fetch
 */
export async function getRoute(token, routeId) {
  const res = await fetch(`${API_URL}/routes/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Error fetching route ${routeId}: ${res.status}`);
  }
  return res.json();
} 