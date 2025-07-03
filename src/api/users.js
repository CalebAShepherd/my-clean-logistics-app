import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all users
 */
export async function listUsers(token) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching users: ${res.status}`);
  return res.json();
} 

/**
 * Fetch current authenticated user's profile
 */
export async function getCurrentUser(token) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching profile: ${res.status}`);
  return res.json();
}

/**
 * Change current authenticated user's password
 */
export async function changePassword(token, currentPassword, newPassword) {
  const res = await fetch(`${API_URL}/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error changing password');
  return data;
}

/**
 * Update current authenticated user's profile
 */
export async function updateProfile(token, profileData) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error updating profile');
  return data;
} 