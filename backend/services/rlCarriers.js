// services/rlCarriers.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RL_API_BASE   = 'https://api.rlcarriers.com';
const RL_TRACK_PATH = '/tracking';
const RL_SHIP_PATH  = '/shipments';

async function getRlApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'RL' } });
  if (!carrier?.apiKey) throw new Error('R+L Carriers API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getRlApiKey();
  const res = await axios.get(`${RL_API_BASE}${RL_TRACK_PATH}/${trackingNumber}`, {
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
  const apiKey = await getRlApiKey();
  const payload = {
    shipper: { address: pickupAddress, contact: pickupContact },
    consignee: { address: deliveryAddress, contact: deliveryContact },
    weight,
    dimensions,
    reference,
    insurance
  };
  const res = await axios.post(`${RL_API_BASE}${RL_SHIP_PATH}`, payload, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };