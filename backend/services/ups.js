// services/ups.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UPS_API_BASE     = 'https://onlinetools.ups.com';
const UPS_TRACK_PATH   = '/track/v1/details';
const UPS_SHIP_PATH    = '/ship/v1/shipments'; // hypothetical path

async function getUpsApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'UPS' } });
  if (!carrier || !carrier.apiKey) throw new Error('UPS API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getUpsApiKey();
  const url    = `${UPS_API_BASE}${UPS_TRACK_PATH}/${trackingNumber}`;
  const res    = await axios.get(url, {
    headers: {
      'AccessLicenseNumber': apiKey,
      'Content-Type':        'application/json'
    }
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
  const apiKey = await getUpsApiKey();
  const url    = `${UPS_API_BASE}${UPS_SHIP_PATH}`;
  const payload = {
    // map into UPS’s Create Shipment API
    ShipmentRequest: {
      Request: { /* ... */ },
      Shipment: {
        Shipper:    { /* address + contact */ },
        ShipTo:     { /* address + contact */ },
        Package:    [{ /* weight + dims */ }],
        ReferenceNumber: reference,
        Transportation:   insurance ? { Insurance: { Charge: {/*...*/} } } : {}
      }
    }
  };

  const res = await axios.post(url, payload, {
    headers: {
      'AccessLicenseNumber': apiKey,
      'Content-Type':        'application/json'
    }
  });
  return res.data;
}

module.exports = { trackShipment, createShipment };