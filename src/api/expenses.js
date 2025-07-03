import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

const getAuthToken = async () => {
  return await AsyncStorage.getItem('userToken');
};

// Expenses
export const getExpenses = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expenses');
  return response.json();
};

export const getExpenseById = async (id) => {
  const response = await apiClient.get(`/api/expenses/${id}`);
  return response.data;
};

export const createExpense = async (expenseData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expenseData),
  });
  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
};

export const updateExpense = async (id, expenseData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expenseData),
  });
  if (!response.ok) throw new Error('Failed to update expense');
  return response.json();
};

export const deleteExpense = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to delete expense');
  return response.json();
};

// Expense Approvals
export const submitExpenseForApproval = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${id}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to submit expense for approval');
  return response.json();
};

export const approveExpense = async (id, approvalData = {}) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${id}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(approvalData),
  });
  if (!response.ok) throw new Error('Failed to approve expense');
  return response.json();
};

export const rejectExpense = async (id, rejectionData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${id}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rejectionData),
  });
  if (!response.ok) throw new Error('Failed to reject expense');
  return response.json();
};

export const getPendingApprovals = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/for-approval`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch pending approvals');
  return response.json();
};

// Expense Analytics
export const getExpenseAnalytics = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/analytics?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expense analytics');
  return response.json();
};

export const getExpensesByCategory = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/analytics/by-category?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expenses by category');
  return response.json();
};

export const getExpensesByWarehouse = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/analytics/by-warehouse?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expenses by warehouse');
  return response.json();
};

export const getExpensesByUser = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/analytics/by-user?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expenses by user');
  return response.json();
};

export const getExpenseTrends = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/analytics/trends?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expense trends');
  return response.json();
};

// Bulk Operations
export const bulkApproveExpenses = async (expenseIds, approvalData = {}) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/bulk/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expenseIds, ...approvalData }),
  });
  if (!response.ok) throw new Error('Failed to bulk approve expenses');
  return response.json();
};

export const bulkRejectExpenses = async (expenseIds, rejectionData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/bulk/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expenseIds, ...rejectionData }),
  });
  if (!response.ok) throw new Error('Failed to bulk reject expenses');
  return response.json();
};

export const bulkUpdateExpenses = async (expenseIds, updateData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/bulk/update`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expenseIds, updateData }),
  });
  if (!response.ok) throw new Error('Failed to bulk update expenses');
  return response.json();
};

export const bulkDeleteExpenses = async (expenseIds) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/bulk/delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expenseIds }),
  });
  if (!response.ok) throw new Error('Failed to bulk delete expenses');
  return response.json();
};

// Receipt Management
export const uploadReceipt = async (expenseId, receiptFile) => {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('receipt', receiptFile);
  
  const response = await fetch(`${API_URL}/api/expenses/${expenseId}/receipt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload receipt');
  return response.json();
};

export const deleteReceipt = async (expenseId, receiptId) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/expenses/${expenseId}/receipt/${receiptId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to delete receipt');
  return response.json();
};

// Export Functions
export const exportExpenses = async (filters = {}, format = 'csv') => {
  const token = await getAuthToken();
  const params = new URLSearchParams({ ...filters, format }).toString();
  const response = await fetch(`${API_URL}/api/expenses/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to export expenses');
  return response.blob();
};

// Expense Dashboard
export const getExpenseDashboard = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/expenses/dashboard?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch expense dashboard');
  return response.json();
}; 