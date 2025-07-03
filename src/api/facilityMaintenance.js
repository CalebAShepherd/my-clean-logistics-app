import { Platform } from 'react-native';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

// Helper function to make authenticated requests
const makeRequest = async (url, options = {}, token = null) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${url}`, config);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const facilityMaintenanceAPI = {
  // =============================================
  // FACILITY MAINTENANCE OPERATIONS
  // =============================================

  // Maintenance Logs
  async getMaintenanceLogs(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/maintenance-logs${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async getMaintenanceLog(id, token = null) {
    const url = `/api/facility-maintenance/maintenance-logs/${id}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async createMaintenanceLog(logData, token = null) {
    const url = `/api/facility-maintenance/maintenance-logs`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(logData) }, token);
  },

  async updateMaintenanceLog(id, logData, token = null) {
    const url = `/api/facility-maintenance/maintenance-logs/${id}`;
    return makeRequest(url, { method: 'PUT', body: JSON.stringify(logData) }, token);
  },

  async completeMaintenanceLog(id, completionData, token = null) {
    const url = `/api/facility-maintenance/maintenance-logs/${id}/complete`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(completionData) }, token);
  },

  async deleteMaintenanceLog(id, token = null) {
    const url = `/api/facility-maintenance/maintenance-logs/${id}`;
    return makeRequest(url, { method: 'DELETE' }, token);
  },

  // =============================================
  // FACILITY COMPLIANCE OPERATIONS
  // =============================================

  // Compliance Records
  async getCompliance(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/compliance${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async getComplianceRecord(id, token = null) {
    const url = `/api/facility-maintenance/compliance/${id}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async createComplianceRecord(complianceData, token = null) {
    const url = `/api/facility-maintenance/compliance`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(complianceData) }, token);
  },

  async updateComplianceRecord(id, complianceData, token = null) {
    const url = `/api/facility-maintenance/compliance/${id}`;
    return makeRequest(url, { method: 'PUT', body: JSON.stringify(complianceData) }, token);
  },

  async deleteComplianceRecord(id, token = null) {
    const url = `/api/facility-maintenance/compliance/${id}`;
    return makeRequest(url, { method: 'DELETE' }, token);
  },

  // =============================================
  // COMPLIANCE AUDIT OPERATIONS
  // =============================================

  // Audits
  async getAudits(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/audits${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async createAudit(auditData, token = null) {
    const url = `/api/facility-maintenance/audits`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(auditData) }, token);
  },

  // =============================================
  // SAFETY INCIDENT OPERATIONS
  // =============================================

  // Safety Incidents
  async getSafetyIncidents(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/safety-incidents${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async createSafetyIncident(incidentData, token = null) {
    const url = `/api/facility-maintenance/safety-incidents`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(incidentData) }, token);
  },

  // =============================================
  // ENVIRONMENTAL MONITORING OPERATIONS
  // =============================================

  // Environmental Monitoring
  async getEnvironmentalMonitoring(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/environmental-monitoring${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  async createEnvironmentalReading(readingData, token = null) {
    const url = `/api/facility-maintenance/environmental-monitoring`;
    return makeRequest(url, { method: 'POST', body: JSON.stringify(readingData) }, token);
  },

  // =============================================
  // ANALYTICS & DASHBOARD
  // =============================================

  // Analytics
  async getAnalytics(params = {}, token = null) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/analytics${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  },

  // Dashboard data
  async getDashboardData(facilityId = null, token = null) {
    const params = facilityId ? { facilityId } : {};
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/facility-maintenance/analytics${queryString ? `?${queryString}` : ''}`;
    return makeRequest(url, { method: 'GET' }, token);
  }
};

export default facilityMaintenanceAPI; 