import { getApiBaseUrl } from '../utils/apiHost';

const BASE_URL = `${getApiBaseUrl()}/audit-trail`;

export async function fetchAuditLogs(token, params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}?${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('fetchAuditLogs error', err);
    throw err;
  }
}

export async function createAuditLog(token, data) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create audit log (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('createAuditLog error', err);
    throw err;
  }
}

// Audit Trail API functions
export const getAuditTrail = async (filters = {}) => {
  // ... existing code ...
} 