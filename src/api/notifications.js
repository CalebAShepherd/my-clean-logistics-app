import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

// Fetch notifications for the authenticated user
export async function fetchNotifications(token) {
  const res = await fetch(`${API_URL}/api/notifications`, {
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
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
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