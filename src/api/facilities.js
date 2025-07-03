import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Fetch all facilities
 */
export async function fetchFacilities(token) {
  const res = await fetch(`${API_URL}/facilities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error fetching facilities: ${res.status}`);
  return res.json();
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, token, options = {}) {
  const { method = 'GET', body, params } = options;
  
  let url = `${API_URL}/api${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const facilityAPI = {
  // Facilities
  getFacilities: async (token, params = {}) => {
    return apiCall('/facilities', token, { params });
  },

  getFacilityById: async (token, id) => {
    return apiCall(`/facilities/${id}`, token);
  },

  createFacility: async (token, facilityData) => {
    return apiCall('/facilities', token, { method: 'POST', body: facilityData });
  },

  updateFacility: async (token, id, updateData) => {
    return apiCall(`/facilities/${id}`, token, { method: 'PUT', body: updateData });
  },

  deleteFacility: async (token, id) => {
    return apiCall(`/facilities/${id}`, token, { method: 'DELETE' });
  },

  // Facility areas
  getFacilityAreas: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/areas`, token, { params });
  },

  createFacilityArea: async (token, facilityId, areaData) => {
    return apiCall(`/facilities/${facilityId}/areas`, token, { method: 'POST', body: areaData });
  },

  updateFacilityArea: async (token, areaId, updateData) => {
    return apiCall(`/facilities/areas/${areaId}`, token, { method: 'PUT', body: updateData });
  },

  // Utility bills
  getUtilityBills: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/utility-bills`, token, { params });
  },

  createUtilityBill: async (token, facilityId, billData) => {
    return apiCall(`/facilities/${facilityId}/utility-bills`, token, { method: 'POST', body: billData });
  },

  // Utility Cost Allocation APIs
  // Allocation Rules
  getAllocationRules: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/allocation-rules`, token, { params });
  },

  createAllocationRule: async (token, facilityId, ruleData) => {
    return apiCall(`/facilities/${facilityId}/allocation-rules`, token, { method: 'POST', body: ruleData });
  },

  updateAllocationRule: async (token, ruleId, updateData) => {
    return apiCall(`/facilities/allocation-rules/${ruleId}`, token, { method: 'PUT', body: updateData });
  },

  deleteAllocationRule: async (token, ruleId) => {
    return apiCall(`/facilities/allocation-rules/${ruleId}`, token, { method: 'DELETE' });
  },

  // Cost Allocation Operations
  allocateUtilityCosts: async (token, billId) => {
    return apiCall(`/facilities/utility-bills/${billId}/allocate`, token, { method: 'POST' });
  },

  getAllocationSummary: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/allocation-summary`, token, { params });
  },

  // Utility Budgets
  getUtilityBudgets: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/budgets`, token, { params });
  },

  createUtilityBudget: async (token, facilityId, budgetData) => {
    return apiCall(`/facilities/${facilityId}/budgets`, token, { method: 'POST', body: budgetData });
  },

  // Variance Analysis
  getVarianceAnalysis: async (token, facilityId, params = {}) => {
    return apiCall(`/facilities/${facilityId}/variance-analysis`, token, { params });
  },

  generateVarianceAnalysis: async (token, facilityId, analysisData) => {
    return apiCall(`/facilities/${facilityId}/variance-analysis`, token, { method: 'POST', body: analysisData });
  },

  // Analytics
  getFacilityAnalytics: async (token, params = {}) => {
    return apiCall('/facilities/analytics', token, { params });
  }
};

export default facilityAPI; 