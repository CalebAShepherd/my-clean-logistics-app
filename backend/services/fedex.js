// services/fedex.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// FedEx API endpoints
const FEDEX_API_BASE       = 'https://apis-sandbox.fedex.com';
const FEDEX_OAUTH_PATH     = '/oauth/token';
const FEDEX_ADDRESS_PATH   = '/address/v1/addresses/validated';
const FEDEX_RATES_PATH     = '/rate/v1/rates';
const FEDEX_SHIP_PATH      = '/ship/v1/shipments';
const FEDEX_PICKUP_PATH    = '/ship/v1/pickups';
const FEDEX_TRACK_PATH   = '/track/v1/trackingnumbers';

// In-memory token cache
let fedexToken = null;
let fedexTokenExpiry = 0;

/**
 * Retrieve and cache FedEx OAuth token
 */
async function getFedexToken() {
  const now = Date.now();
  if (fedexToken && now < fedexTokenExpiry) return fedexToken;
  const creds = await prisma.carrier.findUnique({ where: { code: 'FEDEX' } });
  if (!creds?.apiKey) {
    throw new Error('FedEx apiKey missing');
  }
  let token;
  if (creds.apiSecret) {
    // OAuth flow with client credentials
    const resp = await axios.post(
      `${FEDEX_API_BASE}${FEDEX_OAUTH_PATH}`,
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     creds.apiKey,
        client_secret: creds.apiSecret
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept':       'application/json'
        }
      }
    );
    fedexToken = resp.data.access_token;
    fedexTokenExpiry = now + (resp.data.expires_in - 60) * 1000;
  } else {
    // Fallback: use apiKey directly as token
    console.warn('FedEx apiSecret missing; using apiKey as token');
    token = creds.apiKey;
    fedexTokenExpiry = now + 24 * 60 * 60 * 1000; // cache for 24h
  }
  fedexToken = token;
  return fedexToken;
}

// Existing tracking...
async function trackShipment(trackingNumber) {
  const token = await getFedexToken();
  const url   = `${FEDEX_API_BASE}${FEDEX_TRACK_PATH}`;
  const res   = await axios.post(
    url,
    { trackingInfo: [{ trackingNumber }] },
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// NEW: book (create) a shipment
async function createShipment({
  pickupAddress,
  pickupContact,
  deliveryAddress,
  deliveryContact,
  weight,
  dimensions,      // { length, width, height }
  reference,
  insurance
}) {
  const token = await getFedexToken();
  const url   = `${FEDEX_API_BASE}${FEDEX_SHIP_PATH}`;
  const payload = {
    requestedShipment: {
      shipper: {
        address: pickupAddress,
        contact: {
          personName: pickupContact.name,
          phoneNumber: pickupContact.phone,
          emailAddress: pickupContact.email
        }
      },
      recipient: {
        address: deliveryAddress,
        contact: {
          personName: deliveryContact.name,
          phoneNumber: deliveryContact.phone,
          emailAddress: deliveryContact.email
        }
      },
      packageCount: 1,
      requestedPackageLineItems: [{
        weight: { units: 'LB', value: weight },
        dimensions: {
          length: dimensions.length,
          width:  dimensions.width,
          height: dimensions.height,
          units: 'IN'
        }
      }],
      // optional fields
      shipmentSpecialServices: insurance ? [{ type: 'INSURANCE' }] : [],
      reference: [{ value: reference }],
    }
  };

  const res = await axios.post(url, payload, {
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`
    }
  });
  return res.data;  // extract trackingNumber, label, etc as needed
}

// NEW: Validate an address via FedEx API
async function validateAddress(addressPayload) {
  const token = await getFedexToken();
  const url   = `${FEDEX_API_BASE}${FEDEX_ADDRESS_PATH}`;
  const res   = await axios.post(url, addressPayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// NEW: Get rate quotes
async function getRates(ratePayload) {
  const token = await getFedexToken();
  const url   = `${FEDEX_API_BASE}${FEDEX_RATES_PATH}`;
  const res   = await axios.post(url, ratePayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// NEW: Schedule a pickup
async function requestPickup(pickupPayload) {
  const token = await getFedexToken();
  const url   = `${FEDEX_API_BASE}${FEDEX_PICKUP_PATH}`;
  const res   = await axios.post(url, pickupPayload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

module.exports = {
  getFedexToken,
  validateAddress,
  getRates,
  createShipment,
  requestPickup,
  trackShipment
};