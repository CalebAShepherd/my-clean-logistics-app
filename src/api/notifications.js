import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const BASE_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

// Fetch notifications for the authenticated user
export async function fetchNotifications(token) {
  const res = await fetch(`${BASE_URL}/api/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const error = await res.text().catch(() => null);
    throw new Error(error || 'Failed to fetch notifications');
  }
  return res.json();
}

// Mark a notification as read
export async function markNotificationAsRead(token, id) {
  const res = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const error = await res.text().catch(() => null);
    throw new Error(error || 'Failed to mark notification as read');
  }
  return res.json();
} 