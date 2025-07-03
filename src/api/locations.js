import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './apiClient';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all locations, optionally filtered by warehouseId
 */
export async function fetchLocations(token, warehouseId) {
  const params = new URLSearchParams();
  if (warehouseId) params.append('warehouseId', warehouseId);
  const res = await fetch(`${API_URL}/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching locations: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single location by ID
 */
export async function fetchLocation(token, id) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching location: ${res.status}`);
  return res.json();
}

/**
 * Create a new location
 */
export async function createLocation(token, data) {
  const res = await fetch(`${API_URL}/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    throw new Error(`Error creating location: ${res.status}`);
  }
  if (!res.ok) {
    const msg = body.error || body.message || `Error creating location: ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Update location by ID
 */
export async function updateLocation(token, id, data) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Error updating location: ${res.status}`);
  return res.json();
}

/**
 * Delete a location by ID
 */
export async function deleteLocation(token, id) {
  const res = await fetch(`${API_URL}/locations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting location: ${res.status}`);
}

/**
 * Send the current location for a transporter
 */
export async function updateTransporterLocation(token, userId, latitude, longitude) {
  const res = await fetch(`${API_URL}/locations/fleet-location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, latitude, longitude }),
  });
  if (!res.ok) throw new Error(`Error updating transporter location: ${res.status}`);
  return res.json();
}

/**
 * Fetch all transporter fleet locations (admin, dev, dispatcher)
 */
export async function fetchFleetLocations(token) {
  const res = await fetch(`${API_URL}/locations/fleet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching fleet locations: ${res.status}`);
  return res.json();
}

/**
 * Delete all locations
 */
export async function deleteAllLocations(token) {
  const res = await fetch(`${API_URL}/locations`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Error deleting all locations: ${res.status}`);
}

export const locationsAPI = {
  async getLocations(params = {}) {
    const response = await apiClient.get('/locations', { params });
    return response.data;
  },

  async getLocation(id) {
    const response = await apiClient.get(`/locations/${id}`);
    return response.data;
  },

  async getLocationsByWarehouse(warehouseId) {
    const response = await apiClient.get(`/locations/warehouse/${warehouseId}`);
    return response.data;
  },

  async createLocation(locationData) {
    const response = await apiClient.post('/locations', locationData);
    return response.data;
  },

  async updateLocation(id, locationData) {
    const response = await apiClient.put(`/locations/${id}`, locationData);
    return response.data;
  },

  async deleteLocation(id) {
    const response = await apiClient.delete(`/locations/${id}`);
    return response.data;
  }
};

/**
 * Fetch location hierarchy for hierarchical pickers
 * @param {string} token - Auth token
 * @param {string} warehouseId - Warehouse ID
 * @param {Object} filters - Optional filters { zone, rack, aisle, shelf }
 * @returns {Object} Hierarchy with zones, racks, shelves, bins arrays
 */
export const fetchLocationHierarchy = async (token, warehouseId, filters = {}) => {
  const params = new URLSearchParams({ warehouseId });
  
  // Add optional filters
  if (filters.zone) params.append('zone', filters.zone);
  if (filters.rack) params.append('rack', filters.rack);
  if (filters.aisle) params.append('aisle', filters.aisle);
  if (filters.shelf) params.append('shelf', filters.shelf);
  
  const response = await fetch(`${API_URL}/locations/hierarchy?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch location hierarchy');
  }
  
  return response.json();
};

export default locationsAPI; 