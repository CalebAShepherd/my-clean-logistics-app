import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

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