import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

const getAuthToken = async () => {
  return await AsyncStorage.getItem('userToken');
};

// Enhanced Invoices
export const getInvoicesEnhanced = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch invoices');
  return response.json();
};

export const createInvoiceEnhanced = async (invoiceData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  if (!response.ok) throw new Error('Failed to create invoice');
  return response.json();
};

export const updateInvoiceEnhanced = async (id, invoiceData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  if (!response.ok) throw new Error('Failed to update invoice');
  return response.json();
};

export const sendInvoice = async (id, sendData = {}) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced/${id}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sendData),
  });
  if (!response.ok) throw new Error('Failed to send invoice');
  return response.json();
};

export const voidInvoice = async (id, reason) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced/${id}/void`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to void invoice');
  return response.json();
};

// Payments
export const getPayments = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/payments?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch payments');
  return response.json();
};

export const recordPayment = async (paymentData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });
  if (!response.ok) throw new Error('Failed to record payment');
  return response.json();
};

export const refundPayment = async (id, refundData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/payments/${id}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(refundData),
  });
  if (!response.ok) throw new Error('Failed to process refund');
  return response.json();
};

// Automated Billing
export const getBillingRules = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/rules`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch billing rules');
  return response.json();
};

export const createBillingRule = async (ruleData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/rules`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ruleData),
  });
  if (!response.ok) throw new Error('Failed to create billing rule');
  return response.json();
};

export const updateBillingRule = async (id, ruleData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/rules/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ruleData),
  });
  if (!response.ok) throw new Error('Failed to update billing rule');
  return response.json();
};

export const toggleBillingRule = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/rules/${id}/toggle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to toggle billing rule');
  return response.json();
};

// Billing Analytics
export const getBillingAnalytics = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/analytics?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch billing analytics');
  return response.json();
};

export const getAgingReport = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/aging-report?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch aging report');
  return response.json();
};

export const getRevenueAnalytics = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/revenue-analytics?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch revenue analytics');
  return response.json();
};

// Bulk Operations
export const bulkInvoiceActions = async (action, invoiceIds, data = {}) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced/bulk/${action}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoiceIds, ...data }),
  });
  if (!response.ok) throw new Error(`Failed to perform bulk ${action}`);
  return response.json();
};

// Export Functions
export const exportInvoices = async (filters = {}, format = 'csv') => {
  const token = await getAuthToken();
  const params = new URLSearchParams({ ...filters, format }).toString();
  const response = await fetch(`${API_URL}/api/billing/invoices-enhanced/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to export invoices');
  return response.blob();
};

export const exportPayments = async (filters = {}, format = 'csv') => {
  const token = await getAuthToken();
  const params = new URLSearchParams({ ...filters, format }).toString();
  const response = await fetch(`${API_URL}/api/billing/payments/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to export payments');
  return response.blob();
};

// Billing Dashboard
export const getBillingDashboard = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/billing/dashboard?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch billing dashboard');
  return response.json();
}; 