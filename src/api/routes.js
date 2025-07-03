import Constants from 'expo-constants';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

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

/**
 * Mark a route shipment stop as completed
 */
export async function completeRouteStop(token, routeId, shipmentId) {
  const res = await fetch(`${API_URL}/routes/${routeId}/stops/${shipmentId}/complete`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error completing stop: ${res.status}`);
  }
  return res.json();
}

/**
 * Mark a route shipment stop as skipped
 */
export async function skipRouteStop(token, routeId, shipmentId) {
  const res = await fetch(`${API_URL}/routes/${routeId}/stops/${shipmentId}/skip`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error skipping stop: ${res.status}`);
  }
  return res.json();
}

/**
 * Create and persist a new route
 * @param {string} token - Bearer token
 * @param {string} transporterId
 * @param {string[]} shipmentIds
 */
export async function createRoute(token, transporterId, shipmentIds) {
  const res = await fetch(`${API_URL}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transporterId, shipmentIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error creating route: ${res.status}`);
  }
  return res.json();
} 