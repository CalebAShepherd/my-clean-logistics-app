import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Log outbound shipment: { warehouseId, items: [{itemId, quantity, locationId?}], notes }
 */
export async function logOutboundShipment(token, data) {
  const res = await fetch(`${API_URL}/outbound-shipments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errMsg = `Error ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody && errBody.error) {
        errMsg = errBody.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errMsg);
  }
  return res.json();
} 