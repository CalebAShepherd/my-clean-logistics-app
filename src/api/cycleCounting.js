import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

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
 * Get warehouse workers for task assignment
 * @param {string} token - Auth token
 * @param {string} warehouseId - Warehouse ID
 * @returns {Promise<Array>} - List of warehouse workers
 */
export const getWarehouseWorkers = async (token, warehouseId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/warehouse/${warehouseId}/workers`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch warehouse workers');
  }
  
  return response.json();
};

/**
 * Get task details by ID
 * @param {string} token - Auth token
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - Task details
 */
export const getTaskDetails = async (token, taskId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/tasks/${taskId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Task not found. It may have been deleted or moved.');
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch task details: ${response.status} - ${errorText}`);
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
  console.log('Counting item:', { itemId, countData });
  
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
    const errorData = await response.json().catch(() => ({}));
    console.error('Count item error:', { status: response.status, error: errorData });
    throw new Error(errorData.error || `Failed to count item (${response.status})`);
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

/**
 * Fetch user's assigned tasks
 * @param {string} token - Auth token
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} - User's tasks
 */
export const fetchMyTasks = async (token, params = {}) => {
  const queryParams = new URLSearchParams(params);
  
  // Add cache-busting parameter to ensure fresh data
  queryParams.set('_t', Date.now().toString());
  queryParams.set('_r', Math.random().toString(36));
  
  const response = await fetch(
    `${API_URL}/cycle-counts/my-tasks?${queryParams}`,
    {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch tasks');
  }

  const tasks = await response.json();
  console.log('fetchMyTasks - Fresh data received:', tasks.length, 'tasks');
  return tasks;
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
 * Assign tasks to users (supports bulk assignment)
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @param {Array} assignments - Task assignments (single or bulk)
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
 * Unassign a task from current user
 * @param {string} token - Auth token
 * @param {string} cycleCountId - Cycle count ID
 * @param {string} taskId - Task ID to unassign
 * @returns {Promise<Object>} - Unassignment result
 */
export const unassignCycleCountTask = async (token, cycleCountId, taskId) => {
  const response = await fetch(
    `${API_URL}/cycle-counts/${cycleCountId}/assign-tasks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        assignments: [{ taskId, assignedToId: null }] 
      })
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to unassign task');
  }
  
  return response.json();
}; 