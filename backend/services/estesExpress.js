// services/estesExpress.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ESTES_API_BASE   = 'https://api.estes-express.com';
const ESTES_TRACK_PATH = '/tracking/lookup';
const ESTES_SHIP_PATH  = '/shipments/book';

async function getEstesApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'ESTES' } });
  if (!carrier?.apiKey) throw new Error('Estes API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getEstesApiKey();
  const res = await axios.get(`${ESTES_API_BASE}${ESTES_TRACK_PATH}/${trackingNumber}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
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
  const apiKey = await getEstesApiKey();
  const payload = {
    origin: pickupAddress,
    destination: deliveryAddress,
    contact: { shipper: pickupContact, consignee: deliveryContact },
    weight,
    dimensions,
    reference,
    insurance
  };
  const res = await axios.post(`${ESTES_API_BASE}${ESTES_SHIP_PATH}`, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };