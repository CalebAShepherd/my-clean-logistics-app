import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Log inbound shipment: { warehouseId, items: [{itemId, quantity, locationId?}], notes }
 */
export async function logInboundShipment(token, data) {
  const res = await fetch(`${API_URL}/inbound-shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error logging inbound shipment: ${res.status} ${err}`);
  }
  return res.json();
} 