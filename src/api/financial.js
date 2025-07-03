import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

const getAuthToken = async () => {
  return await AsyncStorage.getItem('userToken');
};

// Chart of Accounts
export const getChartOfAccounts = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/chart-of-accounts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch chart of accounts');
  return response.json();
};

export const createAccount = async (accountData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/chart-of-accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });
  if (!response.ok) throw new Error('Failed to create account');
  return response.json();
};

export const updateAccount = async (id, accountData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/chart-of-accounts/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });
  if (!response.ok) throw new Error('Failed to update account');
  return response.json();
};

export const deleteAccount = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/chart-of-accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to delete account');
  return response.json();
};

// Journal Entries
export const getJournalEntries = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/financial/journal-entries?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch journal entries');
  return response.json();
};

export const createJournalEntry = async (entryData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/journal-entries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  });
  if (!response.ok) throw new Error('Failed to create journal entry');
  return response.json();
};

export const updateJournalEntry = async (id, entryData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/journal-entries/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  });
  if (!response.ok) throw new Error('Failed to update journal entry');
  return response.json();
};

export const approveJournalEntry = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/journal-entries/${id}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to approve journal entry');
  return response.json();
};

export const reverseJournalEntry = async (id, reason) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/journal-entries/${id}/reverse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to reverse journal entry');
  return response.json();
};

// General Ledger
export const getGeneralLedger = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/financial/general-ledger?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch general ledger');
  return response.json();
};

// Financial Reports
export const getTrialBalance = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const url = `${API_URL}/api/financial/reports/trial-balance?${params}`;
  console.log('Trial Balance API call:', { url, token: token ? 'present' : 'missing', filters });
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('Trial Balance response:', { status: response.status, ok: response.ok });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Trial Balance error response:', errorText);
    throw new Error(`Failed to fetch trial balance: ${response.status} ${errorText}`);
  }
  return response.json();
};

export const getProfitAndLoss = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const url = `${API_URL}/api/financial/reports/profit-loss?${params}`;
  console.log('P&L API call:', { url, token: token ? 'present' : 'missing', filters });
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('P&L response:', { status: response.status, ok: response.ok });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('P&L error response:', errorText);
    throw new Error(`Failed to fetch profit and loss: ${response.status} ${errorText}`);
  }
  return response.json();
};

export const getBalanceSheet = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const url = `${API_URL}/api/financial/reports/balance-sheet?${params}`;
  console.log('Balance Sheet API call:', { url, token: token ? 'present' : 'missing', filters });
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('Balance Sheet response:', { status: response.status, ok: response.ok });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Balance Sheet error response:', errorText);
    throw new Error(`Failed to fetch balance sheet: ${response.status} ${errorText}`);
  }
  return response.json();
};

export const getCashFlowStatement = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const url = `${API_URL}/api/financial/reports/cash-flow?${params}`;
  console.log('Cash Flow API call:', { url, token: token ? 'present' : 'missing', filters });
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('Cash Flow response:', { status: response.status, ok: response.ok });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cash Flow error response:', errorText);
    throw new Error(`Failed to fetch cash flow statement: ${response.status} ${errorText}`);
  }
  return response.json();
};

// Cost Centers
export const getCostCenters = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/cost-centers`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch cost centers');
  return response.json();
};

export const createCostCenter = async (costCenterData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/cost-centers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(costCenterData),
  });
  if (!response.ok) throw new Error('Failed to create cost center');
  return response.json();
};

export const updateCostCenter = async (id, costCenterData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/cost-centers/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(costCenterData),
  });
  if (!response.ok) throw new Error('Failed to update cost center');
  return response.json();
};

export const getCostCenterAnalytics = async (id, filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/financial/cost-centers/${id}/analytics?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch cost center analytics');
  return response.json();
};

// Budgets
export const getBudgets = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/budgets`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch budgets');
  return response.json();
};

export const createBudget = async (budgetData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/budgets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetData),
  });
  if (!response.ok) throw new Error('Failed to create budget');
  return response.json();
};

export const updateBudget = async (id, budgetData) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/budgets/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetData),
  });
  if (!response.ok) throw new Error('Failed to update budget');
  return response.json();
};

export const getBudgetAnalysis = async (id) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/budgets/${id}/analysis`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch budget analysis');
  return response.json();
};

// Currencies
export const getCurrencies = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/currencies`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch currencies');
  return response.json();
};

export const getExchangeRates = async (fromCurrency, toCurrency) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/api/financial/exchange-rates?from=${fromCurrency}&to=${toCurrency}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch exchange rates');
  return response.json();
};

// Financial Dashboard
export const getFinancialDashboard = async (filters = {}) => {
  const token = await getAuthToken();
  const params = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/api/financial/dashboard?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch financial dashboard');
  return response.json();
}; 