// services/xpo.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const XPO_API_BASE   = 'https://api.xpologistics.com';
const XPO_TRACK_PATH = '/shipment/track';
const XPO_SHIP_PATH  = '/shipment/book';

async function getXpoApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'XPO' } });
  if (!carrier?.apiKey) throw new Error('XPO API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getXpoApiKey();
  const res = await axios.get(`${XPO_API_BASE}${XPO_TRACK_PATH}`, {
    params: { trackingNumber },
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
  const apiKey = await getXpoApiKey();
  const payload = {
    origin: pickupAddress,
    destination: deliveryAddress,
    contact: { shipper: pickupContact, receiver: deliveryContact },
    weight,
    dimensions,
    reference,
    insurance
  };
  const res = await axios.post(`${XPO_API_BASE}${XPO_SHIP_PATH}`, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };