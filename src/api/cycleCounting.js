import Constants from 'expo-constants';
import { Platform } from 'react-native';

const localhost = Platform.OS === 'android' ? '10.0.2.2' : '192.168.0.73';
const API_URL = Constants.manifest?.extra?.apiUrl || Constants.expoConfig?.extra?.apiUrl || `http://${localhost}:3000`;

/**
 * Fetch all cycle counts for a warehouse
 * @param {string} token - Auth token
 * @param {string} warehouseId - Warehouse ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Cycle counts with pagination
 */
export const fetchCycleCounts = async (token, warehouseId, params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await fetch(
    `${API_URL}/cycle-counts/warehouse/${warehouseId}?${queryParams}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch cycle counts');
  }
  
  return response.json();
};

/**
 * Fetch cycle count details by ID
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @returns {Promise<Object>} - Cycle count details
 */
export const fetchCycleCountDetails = async (token, cycleCountId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/${cycleCountId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch cycle count details');
  }
  
  return response.json();
};

/**
 * Create a new cycle count
 * @param {string} token - Auth token
 * @param {string} warehouseId - Warehouse ID
 * @param {Object} cycleCountData - Cycle count data
 * @returns {Promise<Object>} - Created cycle count
 */
export const createCycleCount = async (token, warehouseId, cycleCountData) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/warehouse/${warehouseId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cycleCountData)
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create cycle count');
  }
  
  return response.json();
};

/**
 * Generate tasks for a cycle count
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @param {Object} taskConfig - Task generation configuration
 * @returns {Promise<Object>} - Generation result
 */
export const generateCycleCountTasks = async (token, cycleCountId, taskConfig) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/${cycleCountId}/generate-tasks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskConfig)
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to generate tasks');
  }
  
  return response.json();
};

/**
 * Assign tasks to users
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @param {Array} assignments - Task assignments
 * @returns {Promise<Object>} - Assignment result
 */
export const assignCycleCountTasks = async (token, cycleCountId, assignments) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/${cycleCountId}/assign-tasks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignments })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to assign tasks');
  }
  
  return response.json();
};

/**
 * Fetch user's assigned tasks
 * @param {string} token - Auth token
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - User's tasks
 */
export const fetchMyTasks = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await fetch(
    `${API_URL}/cycle-counts/tasks/my-tasks?${queryParams}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  return response.json();
};

/**
 * Start a counting task
 * @param {string} token - Auth token
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - Updated task
 */
export const startCycleCountTask = async (token, taskId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/tasks/${taskId}/start`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to start task');
  }
  
  return response.json();
};

/**
 * Count an item
 * @param {string} token - Auth token
 * @param {string} itemId - Item ID
 * @param {Object} countData - Count data
 * @returns {Promise<Object>} - Updated item
 */
export const countItem = async (token, itemId, countData) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/items/${itemId}/count`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(countData)
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to count item');
  }
  
  return response.json();
};

/**
 * Review variance for an item
 * @param {string} token - Auth token
 * @param {string} itemId - Item ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} - Updated item
 */
export const reviewVariance = async (token, itemId, reviewData) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/items/${itemId}/review`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to review variance');
  }
  
  return response.json();
};

/**
 * Complete a cycle count
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @returns {Promise<Object>} - Completed cycle count
 */
export const completeCycleCount = async (token, cycleCountId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/${cycleCountId}/complete`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to complete cycle count');
  }
  
  return response.json();
};

/**
 * Fetch cycle count analytics
 * @param {string} token - Auth token
 * @param {string} warehouseId - Warehouse ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Analytics data
 */
export const fetchCycleCountAnalytics = async (token, warehouseId, params = {}) => {
  const queryParams = new URLSearchParams(params);
  const response = await fetch(
    `${API_URL}/cycle-counts/warehouse/${warehouseId}/analytics?${queryParams}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  
  return response.json();
}; 