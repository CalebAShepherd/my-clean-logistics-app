import apiClient from './apiClient';

// Compliance Reporting API
export const complianceReportingAPI = {
  // Reports
  getReports: (params = {}) =>
    apiClient.get('/compliance-reporting/reports', { params }),

  generateReport: (data) =>
    apiClient.post('/compliance-reporting/reports/generate', data),

  updateReportStatus: (id, data) =>
    apiClient.put(`/compliance-reporting/reports/${id}/status`, data),

  // Metrics
  getMetrics: (params = {}) =>
    apiClient.get('/compliance-reporting/metrics', { params }),

  // Dashboard
  getDashboard: (params = {}) =>
    apiClient.get('/compliance-reporting/dashboard', { params }),
}; 