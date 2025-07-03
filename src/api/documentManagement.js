import apiClient from './apiClient';

// Document Management API
export const documentManagementAPI = {
  // Documents
  getDocuments: (params = {}) =>
    apiClient.get('/document-management/documents', { params }),

  uploadDocument: (formData) =>
    apiClient.post('/document-management/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  downloadDocument: (id) =>
    apiClient.get(`/document-management/documents/${id}/download`, {
      responseType: 'blob',
    }),

  updateDocument: (id, data) =>
    apiClient.put(`/document-management/documents/${id}`, data),

  deleteDocument: (id) =>
    apiClient.delete(`/document-management/documents/${id}`),

  // Retention Policies
  getRetentionPolicies: () =>
    apiClient.get('/document-management/retention-policies'),

  createRetentionPolicy: (data) =>
    apiClient.post('/document-management/retention-policies', data),

  // Expiring Documents
  getExpiringDocuments: (params = {}) =>
    apiClient.get('/document-management/documents/expiring', { params }),
}; 