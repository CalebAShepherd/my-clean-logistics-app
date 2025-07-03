import { getApiBaseUrl } from '../utils/apiHost';

const BASE_URL = `${getApiBaseUrl()}/insurance-claims`;

export async function fetchInsuranceClaims(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${BASE_URL}?${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(`Failed to fetch insurance claims (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('fetchInsuranceClaims error', err);
    throw err;
  }
}

export async function createInsuranceClaim(token, data) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create insurance claim (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('createInsuranceClaim error', err);
    throw err;
  }
}

export async function updateInsuranceClaimStatus(token, claimId, status) {
  try {
    const res = await fetch(`${BASE_URL}/${claimId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Failed to update insurance claim status (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('updateInsuranceClaimStatus error', err);
    throw err;
  }
} 