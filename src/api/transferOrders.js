import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

/**
 * Fetch all transfer orders
 */
export async function fetchTransferOrders(token) {
  const res = await fetch(`${API_URL}/transfer-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching transfer orders: ${res.status}`);
  return res.json();
}

/**
 * Create a new transfer order
 */
export async function createTransferOrder(token, data) {
  const res = await fetch(`${API_URL}/transfer-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Error creating transfer order: ${res.status}`);
  }
  return res.json();
} 