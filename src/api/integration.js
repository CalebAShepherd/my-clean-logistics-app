import { getApiUrl } from '../utils/apiHost';

const BASE_URL = getApiUrl();

/**
 * Integration API Service
 * Handles all integration-related API calls using plain fetch
 */

/**
 * Get integration dashboard data
 */
export const fetchIntegrationDashboard = async (period = '7d') => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/dashboard?period=${period}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching integration dashboard:', error);
    throw error;
  }
};

/**
 * Get integration health status
 */
export const fetchIntegrationHealth = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching integration health:', error);
    throw error;
  }
};

/**
 * Get integration events with pagination and filtering
 */
export const fetchIntegrationEvents = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.eventType) queryParams.append('eventType', params.eventType);
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const url = `${BASE_URL}/api/integration/events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching integration events:', error);
    throw error;
  }
};

/**
 * Trigger manual integration event
 */
export const triggerIntegrationEvent = async (eventType, eventData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/trigger-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        eventData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error triggering integration event:', error);
    throw error;
  }
};

/**
 * Run batch reconciliation
 */
export const runBatchReconciliation = async (date = null) => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/batch-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: date || new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error running batch reconciliation:', error);
    throw error;
  }
};

/**
 * Get integration configuration
 */
export const fetchIntegrationConfig = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/config`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching integration config:', error);
    throw error;
  }
};

/**
 * Update integration configuration
 */
export const updateIntegrationConfig = async (config) => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating integration config:', error);
    throw error;
  }
};

/**
 * Get integration reports
 */
export const fetchIntegrationReports = async (reportType = 'summary', period = '30d') => {
  try {
    const response = await fetch(`${BASE_URL}/api/integration/reports?reportType=${reportType}&period=${period}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching integration reports:', error);
    throw error;
  }
};

// Helper function to format integration event data for display
export const formatIntegrationEvent = (event) => {
  return {
    id: event.id,
    title: event.entryNumber || 'Unknown Event',
    description: event.description || 'No description',
    amount: event.totalAmount || 0,
    status: event.status || 'unknown',
    timestamp: event.createdAt,
    source: event.metadata?.source || 'unknown',
    type: getEventTypeFromSource(event.metadata?.source)
  };
};

// Helper function to get event type from source
const getEventTypeFromSource = (source) => {
  const typeMap = {
    'wave_completion': 'Warehouse Operation',
    'shipment_delivery': 'Revenue Recognition',
    'inventory_received': 'Inventory Management',
    'stock_movement': 'Inventory Adjustment',
    'asset_maintenance': 'Asset Management',
    'batch_reconciliation': 'System Reconciliation'
  };
  
  return typeMap[source] || 'System Integration';
};

// Helper function to get event status color
export const getEventStatusColor = (status) => {
  const colorMap = {
    'POSTED': '#10B981',
    'PENDING': '#F59E0B',
    'DRAFT': '#6B7280',
    'CANCELLED': '#EF4444'
  };
  
  return colorMap[status] || '#6B7280';
};

// Helper function to format currency for display
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

// Helper function to format date for display
export const formatEventDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}; 