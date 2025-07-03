import apiClient from './apiClient';

export const spaceOptimizationAPI = {
  /**
   * Get comprehensive space utilization analysis
   */
  async getSpaceOptimizationAnalysis({ facilityId, warehouseId } = {}) {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const response = await apiClient.get(`/space-optimization/analysis?${params}`);
    return response.data;
  },

  /**
   * Get slotting optimization recommendations
   */
  async getSlottingOptimization({ warehouseId } = {}) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const response = await apiClient.get(`/space-optimization/slotting?${params}`);
    return response.data;
  },

  /**
   * Get space trend analysis and capacity predictions
   */
  async getSpaceTrendAnalysis({ warehouseId, facilityId } = {}) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId);
    if (facilityId) params.append('facilityId', facilityId);
    
    const response = await apiClient.get(`/space-optimization/trends?${params}`);
    return response.data;
  },

  /**
   * Get layout optimization recommendations
   */
  async getLayoutOptimization({ warehouseId } = {}) {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const response = await apiClient.get(`/space-optimization/layout?${params}`);
    return response.data;
  },

  /**
   * Update facility area utilization
   */
  async updateFacilityAreaUtilization(areaId, { currentUtilization, notes }) {
    const response = await apiClient.post(`/space-optimization/facility-areas/${areaId}/utilization`, {
      currentUtilization,
      notes
    });
    return response.data;
  },

  /**
   * Get prioritized optimization recommendations
   */
  async getOptimizationRecommendations({ facilityId, warehouseId, priority = 'all' } = {}) {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    if (priority !== 'all') params.append('priority', priority);
    
    const response = await apiClient.get(`/space-optimization/recommendations?${params}`);
    return response.data;
  },

  /**
   * Get space optimization dashboard data
   */
  async getSpaceOptimizationDashboard({ facilityId, warehouseId } = {}) {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const response = await apiClient.get(`/space-optimization/dashboard?${params}`);
    return response.data;
  }
}; 