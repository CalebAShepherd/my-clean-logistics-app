import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const BASE_URL =
  Constants.manifest?.extra?.apiUrl ||
  Constants.expoConfig?.extra?.apiUrl ||
  `http://${localhost}:3000`;

// Fetch all announcements (admin)
export async function fetchAnnouncements(token) {
  const res = await fetch(`${BASE_URL}/api/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.text().catch(() => null);
    throw new Error(error || 'Failed to fetch announcements');
  }
  return res.json();
}

// Create a new announcement (admin)
export async function createAnnouncement(token, payload) {
  const res = await fetch(`${BASE_URL}/api/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.text().catch(() => null);
    throw new Error(error || 'Failed to create announcement');
  }
  return res.json();
} 