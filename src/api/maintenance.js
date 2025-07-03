import apiClient from './apiClient';

export const maintenanceAPI = {
  // Maintenance Schedules
  async getMaintenanceSchedules(params = {}) {
    const response = await apiClient.get('/maintenance/schedules', { params });
    return response.data;
  },

  async getMaintenanceSchedule(id) {
    const response = await apiClient.get(`/maintenance/schedules/${id}`);
    return response.data;
  },

  async createMaintenanceSchedule(scheduleData) {
    const response = await apiClient.post('/maintenance/schedules', scheduleData);
    return response.data;
  },

  async updateMaintenanceSchedule(id, scheduleData) {
    const response = await apiClient.put(`/maintenance/schedules/${id}`, scheduleData);
    return response.data;
  },

  async deleteMaintenanceSchedule(id) {
    const response = await apiClient.delete(`/maintenance/schedules/${id}`);
    return response.data;
  },

  // Work Orders
  async getWorkOrders(params = {}) {
    const response = await apiClient.get('/maintenance/work-orders', { params });
    return response.data;
  },

  async getWorkOrder(id) {
    const response = await apiClient.get(`/maintenance/work-orders/${id}`);
    return response.data;
  },

  async createWorkOrder(workOrderData) {
    const response = await apiClient.post('/maintenance/work-orders', workOrderData);
    return response.data;
  },

  async updateWorkOrder(id, workOrderData) {
    const response = await apiClient.put(`/maintenance/work-orders/${id}`, workOrderData);
    return response.data;
  },

  async deleteWorkOrder(id) {
    const response = await apiClient.delete(`/maintenance/work-orders/${id}`);
    return response.data;
  },

  async completeWorkOrder(id, completionData) {
    const response = await apiClient.post(`/maintenance/work-orders/${id}/complete`, completionData);
    return response.data;
  },

  async assignWorkOrder(id, userId) {
    const response = await apiClient.post(`/maintenance/work-orders/${id}/assign`, { userId });
    return response.data;
  },

  // Maintenance History
  async getMaintenanceHistory(assetId, params = {}) {
    const response = await apiClient.get(`/maintenance/history/${assetId}`, { params });
    return response.data;
  },

  async getUpcomingMaintenance(assetId) {
    const response = await apiClient.get(`/maintenance/upcoming/${assetId}`);
    return response.data;
  },

  async createMaintenanceLog(logData) {
    const response = await apiClient.post('/maintenance/logs', logData);
    return response.data;
  },

  // Maintenance Analytics
  async getMaintenanceAnalytics(params = {}) {
    const response = await apiClient.get('/maintenance/analytics', { params });
    return response.data;
  },

  async getMaintenanceCosts(params = {}) {
    const response = await apiClient.get('/maintenance/analytics/costs', { params });
    return response.data;
  },

  async getMaintenanceMetrics(params = {}) {
    const response = await apiClient.get('/maintenance/analytics/metrics', { params });
    return response.data;
  },

  // Parts and Inventory
  async getWorkOrderParts(workOrderId) {
    const response = await apiClient.get(`/maintenance/work-orders/${workOrderId}/parts`);
    return response.data;
  },

  async addWorkOrderPart(workOrderId, partData) {
    const response = await apiClient.post(`/maintenance/work-orders/${workOrderId}/parts`, partData);
    return response.data;
  },

  async removeWorkOrderPart(workOrderId, partId) {
    const response = await apiClient.delete(`/maintenance/work-orders/${workOrderId}/parts/${partId}`);
    return response.data;
  },

  // Asset Readings
  async getAssetReadings(assetId, params = {}) {
    const response = await apiClient.get(`/maintenance/assets/${assetId}/readings`, { params });
    return response.data;
  },

  async recordAssetReading(assetId, readingData) {
    const response = await apiClient.post(`/maintenance/assets/${assetId}/readings`, readingData);
    return response.data;
  },

  // Preventive Maintenance
  async triggerPreventiveMaintenance(assetId) {
    const response = await apiClient.post(`/maintenance/preventive/${assetId}/trigger`);
    return response.data;
  },

  async getPreventiveMaintenanceSchedule(assetId) {
    const response = await apiClient.get(`/maintenance/preventive/${assetId}/schedule`);
    return response.data;
  },

  // Maintenance Reports
  async generateMaintenanceReport(params = {}) {
    const response = await apiClient.get('/maintenance/reports/generate', { params });
    return response.data;
  },

  async getMaintenanceReports(params = {}) {
    const response = await apiClient.get('/maintenance/reports', { params });
    return response.data;
  },

  // Maintenance Dashboard
  async getDashboardData(params = {}) {
    const response = await apiClient.get('/maintenance/dashboard', { params });
    return response.data;
  },

  async getMaintenanceAlerts() {
    const response = await apiClient.get('/maintenance/alerts');
    return response.data;
  },

  // Utility functions for maintenance data
  calculateMaintenanceCost(laborHours, laborRate, partsCost = 0) {
    const laborCost = laborHours * laborRate;
    return laborCost + partsCost;
  },

  getMaintenanceStatus(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'OVERDUE';
    if (diffDays <= 7) return 'DUE_SOON';
    if (diffDays <= 30) return 'UPCOMING';
    return 'SCHEDULED';
  },

  formatMaintenanceType(type) {
    const types = {
      PREVENTIVE: 'Preventive',
      CORRECTIVE: 'Corrective',
      EMERGENCY: 'Emergency',
      INSPECTION: 'Inspection',
      CALIBRATION: 'Calibration',
      CLEANING: 'Cleaning',
      UPGRADE: 'Upgrade'
    };
    return types[type] || type;
  },

  getMaintenancePriorityColor(priority) {
    const colors = {
      LOW: '#22C55E',
      MEDIUM: '#F59E0B',
      HIGH: '#EF4444',
      CRITICAL: '#DC2626'
    };
    return colors[priority] || '#6B7280';
  }
};

export default maintenanceAPI; 