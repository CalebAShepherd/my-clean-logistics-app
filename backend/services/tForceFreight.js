// services/tForceFreight.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TFORCE_API_BASE   = 'https://api.tforcefreight.com';
const TFORCE_TRACK_PATH = '/shipments/track';
const TFORCE_SHIP_PATH  = '/shipments/book';

async function getTForceApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'TFORCE' } });
  if (!carrier?.apiKey) throw new Error('TForce Freight API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getTForceApiKey();
  const res = await axios.get(`${TFORCE_API_BASE}${TFORCE_TRACK_PATH}/${trackingNumber}`, {
    headers: { 'x-api-key': apiKey }
  });
  return res.data;
}

async function createShipment({
  pickupAddress,
  pickupContact,
  deliveryAddress,
  deliveryContact,
  weight,
  dimensions,
  reference,
  insurance
}) {
  const apiKey = await getTForceApiKey();
  const payload = {
    pickup:    { address: pickupAddress, contact: pickupContact },
    delivery:  { address: deliveryAddress, contact: deliveryContact },
    weight,
    dimensions,
    reference,
    insurance
  };
  const res = await axios.post(`${TFORCE_API_BASE}${TFORCE_SHIP_PATH}`, payload, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };