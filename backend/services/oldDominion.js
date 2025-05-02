// services/oldDominion.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ODFL_API_BASE   = 'https://api.odfl.com';
const ODFL_TRACK_PATH = '/track';
const ODFL_SHIP_PATH  = '/ship';

async function getOdfLApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'ODFL' } });
  if (!carrier?.apiKey) throw new Error('Old Dominion API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getOdfLApiKey();
  const res = await axios.get(`${ODFL_API_BASE}${ODFL_TRACK_PATH}/${trackingNumber}`, {
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
  const apiKey = await getOdfLApiKey();
  const payload = {
    pickup:    { address: pickupAddress, contact: pickupContact },
    delivery:  { address: deliveryAddress, contact: deliveryContact },
    weight,
    dimensions,
    reference,
    insurance
  };
  const res = await axios.post(`${ODFL_API_BASE}${ODFL_SHIP_PATH}`, payload, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };