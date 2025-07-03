import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Sends a floor plan image (base64) to the backend for analysis.
 * @param {string} base64Image - Base64-encoded PNG data
 * @param {number} width - image width in px
 * @param {number} height - image height in px
 */
export async function analyzeFloorPlanBackend(base64Image, width, height) {
  const token = await AsyncStorage.getItem('userToken');
  const response = await fetch(`${API_URL}/api/floorplan/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ base64Image, width, height })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Floor plan analysis failed: ${response.status} ${errorText}`);
  }
  return response.json();
} 