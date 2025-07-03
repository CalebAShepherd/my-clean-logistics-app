import apiClient from './apiClient';

// Activity Center API
export const getActivityCenters = async () => {
  return apiClient.get('/activity-based-costing/activity-centers');
};

export const getActivityCenter = async (id) => {
  return apiClient.get(`/activity-based-costing/activity-centers/${id}`);
};

export const createActivityCenter = async (data) => {
  return apiClient.post('/activity-based-costing/activity-centers', data);
};

export const updateActivityCenter = async (id, data) => {
  return apiClient.put(`/activity-based-costing/activity-centers/${id}`, data);
};

export const deleteActivityCenter = async (id) => {
  return apiClient.delete(`/activity-based-costing/activity-centers/${id}`);
};

// Activity Cost API
export const getActivityCosts = async (params = {}) => {
  return apiClient.get('/activity-based-costing/activity-costs', { params });
};

export const getActivityCost = async (id) => {
  return apiClient.get(`/activity-based-costing/activity-costs/${id}`);
};

export const createActivityCost = async (data) => {
  return apiClient.post('/activity-based-costing/activity-costs', data);
};

export const updateActivityCost = async (id, data) => {
  return apiClient.put(`/activity-based-costing/activity-costs/${id}`, data);
};

export const deleteActivityCost = async (id) => {
  return apiClient.delete(`/activity-based-costing/activity-costs/${id}`);
};

// Cost Allocation API
export const getCostAllocations = async (params = {}) => {
  return apiClient.get('/activity-based-costing/cost-allocations', { params });
};

export const getCostAllocation = async (id) => {
  return apiClient.get(`/activity-based-costing/cost-allocations/${id}`);
};

export const createCostAllocation = async (data) => {
  return apiClient.post('/activity-based-costing/cost-allocations', data);
};

export const updateCostAllocation = async (id, data) => {
  return apiClient.put(`/activity-based-costing/cost-allocations/${id}`, data);
};

export const deleteCostAllocation = async (id) => {
  return apiClient.delete(`/activity-based-costing/cost-allocations/${id}`);
};

// Customer Profitability API
export const getCustomerProfitability = async (params = {}) => {
  return apiClient.get('/activity-based-costing/customer-profitability', { params });
};

export const getCustomerProfitabilityById = async (id) => {
  return apiClient.get(`/activity-based-costing/customer-profitability/${id}`);
};

export const createCustomerProfitability = async (data) => {
  return apiClient.post('/activity-based-costing/customer-profitability', data);
};

export const updateCustomerProfitability = async (id, data) => {
  return apiClient.put(`/activity-based-costing/customer-profitability/${id}`, data);
};

export const deleteCustomerProfitability = async (id) => {
  return apiClient.delete(`/activity-based-costing/customer-profitability/${id}`);
};

// Service Profitability API
export const getServiceProfitability = async (params = {}) => {
  return apiClient.get('/activity-based-costing/service-profitability', { params });
};

export const getServiceProfitabilityById = async (id) => {
  return apiClient.get(`/activity-based-costing/service-profitability/${id}`);
};

export const createServiceProfitability = async (data) => {
  return apiClient.post('/activity-based-costing/service-profitability', data);
};

export const updateServiceProfitability = async (id, data) => {
  return apiClient.put(`/activity-based-costing/service-profitability/${id}`, data);
};

export const deleteServiceProfitability = async (id) => {
  return apiClient.delete(`/activity-based-costing/service-profitability/${id}`);
};

// Analysis endpoints
export const getActivityCostAnalysis = async (params = {}) => {
  return apiClient.get('/activity-based-costing/activity-cost-analysis', { params });
};

export const getCostAllocationAnalysis = async (params = {}) => {
  return apiClient.get('/activity-based-costing/cost-allocation-analysis', { params });
};

export const getCustomerProfitabilityAnalysis = async (customerId) => {
  return apiClient.get(`/activity-based-costing/customer-profitability-analysis/${customerId}`);
};

export const getServiceProfitabilityAnalysis = async (serviceType) => {
  return apiClient.get(`/activity-based-costing/service-profitability-analysis/${serviceType}`);
};

export const getActivityBasedCostingDashboard = async () => {
  return apiClient.get('/activity-based-costing/dashboard');
}; 