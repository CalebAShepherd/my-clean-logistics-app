import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

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