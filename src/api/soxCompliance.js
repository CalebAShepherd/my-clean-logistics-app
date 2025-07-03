import { getApiBaseUrl } from '../utils/apiHost';

const BASE_URL = `${getApiBaseUrl()}/sox-compliance`;

export async function fetchSoxControls(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${BASE_URL}/controls?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error(`Failed to fetch SOX controls (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('fetchSoxControls error', err);
    throw err;
  }
}

export async function createSoxControl(token, data) {
  try {
    const res = await fetch(`${BASE_URL}/controls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create SOX control (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('createSoxControl error', err);
    throw err;
  }
}

export async function fetchSoxTests(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${BASE_URL}/tests?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error(`Failed to fetch SOX tests (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('fetchSoxTests error', err);
    throw err;
  }
}

export async function createSoxTest(token, data) {
  try {
    const res = await fetch(`${BASE_URL}/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create SOX test (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error('createSoxTest error', err);
    throw err;
  }
} 