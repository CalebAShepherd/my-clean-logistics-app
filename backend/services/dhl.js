// services/dhl.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DHL_API_BASE    = 'https://api-eu.dhl.com';
const DHL_TRACK_PATH  = '/track/shipments';
const DHL_SHIP_PATH   = '/shipping/v1/shipments';

async function getDhlApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'DHL' } });
  if (!carrier?.apiKey) throw new Error('DHL API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getDhlApiKey();
  const url    = `${DHL_API_BASE}${DHL_TRACK_PATH}?trackingNumber=${trackingNumber}`;
  const res    = await axios.get(url, {
    headers: { 'DHL-API-Key': apiKey, Accept: 'application/json' }
  });
  return res.data;
}

async function createShipment({
  pickupAddress, pickupContact,
  deliveryAddress, deliveryContact,
  weight, dimensions,
  reference, insurance
}) {
  const apiKey = await getDhlApiKey();
  const url    = `${DHL_API_BASE}${DHL_SHIP_PATH}`;
  const payload = {
    // DHL’s JSON schema
    plannedShippingDateAndTime: new Date().toISOString(),
    pickup: { address: pickupAddress, contact: pickupContact },
    delivery: { address: deliveryAddress, contact: deliveryContact },
    products: [{
      weight:     { value: weight, units: 'KG' },
      dimensions: { length: dimensions.length, width: dimensions.width, height: dimensions.height, units: 'CM' }
    }],
    customerDetails: { shipperDetails: {/*...*/}, receiverDetails: {/*...*/} },
    // references, insurance via services
    // …
  };

  const res = await axios.post(url, payload, {
    headers: {
      'DHL-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
}

// backend/services/dhl.js
module.exports = {
  getDhlToken:    async () => { /* no-op until creds exist */ },
  trackShipment:  async () => { throw new Error('DHL sandbox not set up'); },
  createShipment: async () => { /* stub */ },
  getRates:       async () => { /* stub */ },
  requestPickup:  async () => { /* stub */ },
};