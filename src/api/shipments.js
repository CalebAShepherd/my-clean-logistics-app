import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

// Fetch inbound shipments for a warehouse, filtered by status
export async function fetchInboundShipments(token, warehouseId, status) {
  const res = await fetch(`${API_URL}/warehouses/${warehouseId}/inbound-shipments?status=${encodeURIComponent(status)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Failed to fetch inbound shipments');
  }
  return res.json();
}

/**
 * Fetch the 4 most recent shipments for the dashboard
 */
export async function fetchRecentShipments(token) {
  const res = await fetch(`${API_URL}/api/shipments/recent`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching recent shipments: ${res.status}`);
  return res.json();
}

export async function updateShipmentStatus(token, shipmentId, status) {
  const res = await fetch(`${API_URL}/api/shipments/${shipmentId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.text().catch(() => null);
    throw new Error(error || `Error updating shipment status: ${res.status}`);
  }
  return res.json();
} 