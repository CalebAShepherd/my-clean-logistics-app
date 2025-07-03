import Constants from 'expo-constants';
import { getApiUrl } from '../utils/apiHost';

const API_URL = getApiUrl();

/**
 * Create a new offer for a route and transporter
 * @param {string} token - Bearer token
 * @param {string} routeId
 * @param {string} transporterId
 */
export async function createOffer(token, routeId, transporterId) {
  const res = await fetch(`${API_URL}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ routeId, transporterId }),
  });
  if (!res.ok) {
    throw new Error(`Error creating offer: ${res.status}`);
  }
  return res.json();
}

/**
 * List offers for the authenticated transporter
 * @param {string} token - Bearer token
 */
export async function listOffers(token) {
  const res = await fetch(`${API_URL}/offers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Error fetching offers: ${res.status}`);
  }
  return res.json();
}

/**
 * Update an offer status (accept/decline)
 * @param {string} token - Bearer token
 * @param {string} offerId
 * @param {'accepted'|'declined'} status
 */
export async function updateOffer(token, offerId, status) {
  const res = await fetch(`${API_URL}/offers/${offerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Error updating offer: ${res.status}`);
  }
  return res.json();
}

// Offers API functions
export const getOffers = async () => {
  // ... existing code ...
} 