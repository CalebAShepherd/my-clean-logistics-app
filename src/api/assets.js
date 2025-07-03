import apiClient from './apiClient';

export const assetAPI = {
  // Get assets with filters and pagination
  getAssets: async (params = {}) => {
    const response = await apiClient.get('/assets', { params });
    return response.data;
  },

  // Get single asset by ID
  getAssetById: async (id) => {
    const response = await apiClient.get(`/assets/${id}`);
    return response.data;
  },

  // Create new asset
  createAsset: async (assetData) => {
    const response = await apiClient.post('/assets', assetData);
    return response.data;
  },

  // Update asset
  updateAsset: async (id, updateData) => {
    const response = await apiClient.put(`/assets/${id}`, updateData);
    return response.data;
  },

  // Delete asset
  deleteAsset: async (id) => {
    const response = await apiClient.delete(`/assets/${id}`);
    return response.data;
  },

  // Get asset analytics
  getAssetAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/assets/analytics', { 
        params: {
          timeRange: params.timeRange || '3months',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset analytics:', error);
      throw error;
    }
  },

  // Record asset reading
  recordAssetReading: async (assetId, readingData) => {
    const response = await apiClient.post(`/assets/${assetId}/readings`, readingData);
    return response.data;
  },

  // Analytics Functions
  getAssetMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/assets/metrics', { 
        params: {
          timeRange: params.timeRange || '3months',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset metrics:', error);
      throw error;
    }
  },

  getAssetTrends: async (params = {}) => {
    try {
      const response = await apiClient.get('/assets/trends', { 
        params: {
          timeRange: params.timeRange || '3months',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset trends:', error);
      throw error;
    }
  },

  getAssetUtilization: async (assetId, timeRange = '30days') => {
    try {
      const response = await apiClient.get(`/assets/${assetId}/utilization`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset utilization:', error);
      throw error;
    }
  },

  getAssetPerformance: async (assetId, timeRange = '30days') => {
    try {
      const response = await apiClient.get(`/assets/${assetId}/performance`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset performance:', error);
      throw error;
    }
  },

  getDepreciationSchedule: async (assetId) => {
    try {
      const response = await apiClient.get(`/assets/${assetId}/depreciation`);
      return response.data;
    } catch (error) {
      console.error('Error fetching depreciation schedule:', error);
      throw error;
    }
  },

  getAssetReports: async (reportType, params = {}) => {
    try {
      const response = await apiClient.get(`/assets/reports/${reportType}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset reports:', error);
      throw error;
    }
  },

  getAssetComparison: async (assetIds, metrics) => {
    try {
      const response = await apiClient.post('/assets/compare', {
        assetIds,
        metrics
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching asset comparison:', error);
      throw error;
    }
  },

  exportAssetData: async (format = 'csv', filters = {}) => {
    try {
      const response = await apiClient.get('/assets/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting asset data:', error);
      throw error;
    }
  },
};

export default assetAPI; 