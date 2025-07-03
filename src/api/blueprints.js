import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Create a new blueprint
export const createBlueprint = async (blueprintData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints`, {
      method: 'POST',
      headers,
      body: JSON.stringify(blueprintData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create blueprint');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating blueprint:', error);
    throw error;
  }
};

// Get all blueprints for a warehouse
export const getBlueprintsByWarehouse = async (warehouseId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints/warehouse/${warehouseId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch blueprints');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching blueprints by warehouse:', error);
    throw error;
  }
};

// Get a specific blueprint by ID
export const getBlueprintById = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch blueprint');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching blueprint by ID:', error);
    throw error;
  }
};

// Update a blueprint
export const updateBlueprint = async (id, updateData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update blueprint');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating blueprint:', error);
    throw error;
  }
};

// Delete a blueprint
export const deleteBlueprint = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete blueprint');
    }

    return true;
  } catch (error) {
    console.error('Error deleting blueprint:', error);
    throw error;
  }
};

// Get blueprints created by current user
export const getMyBlueprints = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/blueprints/my`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch blueprints');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user blueprints:', error);
    throw error;
  }
}; 