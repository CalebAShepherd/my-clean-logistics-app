import apiClient from './apiClient';

// Risk Assessment API
export const riskAssessmentAPI = {
  // Risk Assessments
  getAssessments: (params = {}) =>
    apiClient.get('/risk-assessment/assessments', { params }),

  createAssessment: (data) =>
    apiClient.post('/risk-assessment/assessments', data),

  updateAssessment: (id, data) =>
    apiClient.put(`/risk-assessment/assessments/${id}`, data),

  deleteAssessment: (id) =>
    apiClient.delete(`/risk-assessment/assessments/${id}`),

  // Credit Limits
  getCreditLimits: (params = {}) =>
    apiClient.get('/risk-assessment/credit-limits', { params }),

  createCreditLimit: (data) =>
    apiClient.post('/risk-assessment/credit-limits', data),

  updateCreditLimit: (id, data) =>
    apiClient.put(`/risk-assessment/credit-limits/${id}`, data),

  // Dashboard and Reports
  getDashboard: (params = {}) =>
    apiClient.get('/risk-assessment/dashboard', { params }),

  generateReport: (params = {}) =>
    apiClient.get('/risk-assessment/reports', { params }),
}; 