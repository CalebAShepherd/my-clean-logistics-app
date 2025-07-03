import apiClient from './apiClient';

// Budget Scenario API
export const getBudgetScenarios = async () => {
  return apiClient.get('/budgeting-forecasting/budget-scenarios');
};

export const getBudgetScenario = async (id) => {
  return apiClient.get(`/budgeting-forecasting/budget-scenarios/${id}`);
};

export const createBudgetScenario = async (data) => {
  return apiClient.post('/budgeting-forecasting/budget-scenarios', data);
};

export const updateBudgetScenario = async (id, data) => {
  return apiClient.put(`/budgeting-forecasting/budget-scenarios/${id}`, data);
};

export const deleteBudgetScenario = async (id) => {
  return apiClient.delete(`/budgeting-forecasting/budget-scenarios/${id}`);
};

// Budget Forecast API
export const getBudgetForecasts = async () => {
  return apiClient.get('/budgeting-forecasting/budget-forecasts');
};

export const getBudgetForecast = async (id) => {
  return apiClient.get(`/budgeting-forecasting/budget-forecasts/${id}`);
};

export const createBudgetForecast = async (data) => {
  return apiClient.post('/budgeting-forecasting/budget-forecasts', data);
};

export const updateBudgetForecast = async (id, data) => {
  return apiClient.put(`/budgeting-forecasting/budget-forecasts/${id}`, data);
};

export const deleteBudgetForecast = async (id) => {
  return apiClient.delete(`/budgeting-forecasting/budget-forecasts/${id}`);
};

// Cash Flow Forecast API
export const getCashFlowForecasts = async () => {
  return apiClient.get('/budgeting-forecasting/cash-flow-forecasts');
};

export const getCashFlowForecast = async (id) => {
  return apiClient.get(`/budgeting-forecasting/cash-flow-forecasts/${id}`);
};

export const createCashFlowForecast = async (data) => {
  return apiClient.post('/budgeting-forecasting/cash-flow-forecasts', data);
};

export const updateCashFlowForecast = async (id, data) => {
  return apiClient.put(`/budgeting-forecasting/cash-flow-forecasts/${id}`, data);
};

export const deleteCashFlowForecast = async (id) => {
  return apiClient.delete(`/budgeting-forecasting/cash-flow-forecasts/${id}`);
};

// Variance Analysis API
export const getVarianceAnalysis = async () => {
  return apiClient.get('/budgeting-forecasting/variance-analysis');
};

export const getVarianceAnalysisById = async (id) => {
  return apiClient.get(`/budgeting-forecasting/variance-analysis/${id}`);
};

export const createVarianceAnalysis = async (data) => {
  return apiClient.post('/budgeting-forecasting/variance-analysis', data);
};

export const updateVarianceAnalysis = async (id, data) => {
  return apiClient.put(`/budgeting-forecasting/variance-analysis/${id}`, data);
};

export const deleteVarianceAnalysis = async (id) => {
  return apiClient.delete(`/budgeting-forecasting/variance-analysis/${id}`);
};

// Analysis and reporting endpoints
export const getBudgetPerformance = async (scenarioId) => {
  return apiClient.get(`/budgeting-forecasting/budget-performance/${scenarioId}`);
};

export const getCashFlowAnalysis = async (forecastId) => {
  return apiClient.get(`/budgeting-forecasting/cash-flow-analysis/${forecastId}`);
};

export const getVarianceSummary = async () => {
  return apiClient.get('/budgeting-forecasting/variance-summary');
};

// Dashboard endpoint for aggregated data
export const getBudgetingForecastingDashboard = async () => {
  return apiClient.get('/budgeting-forecasting/dashboard');
}; 