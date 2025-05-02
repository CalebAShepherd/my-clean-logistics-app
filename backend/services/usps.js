// services/usps.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USPS_API_BASE   = 'https://secure.shippingapis.com/ShippingAPI.dll';
const USPS_TRACK_PATH = '?API=TrackV2&XML=';
const USPS_SHIP_PATH  = '?API=PriorityMailIntl&XML='; // example

async function getUspsApiKey() {
  const carrier = await prisma.carrier.findUnique({ where: { code: 'USPS' } });
  if (!carrier?.apiKey) throw new Error('USPS API key not configured');
  return carrier.apiKey;
}

async function trackShipment(trackingNumber) {
  const apiKey = await getUspsApiKey();
  const xml = `<TrackFieldRequest USERID="${apiKey}"><TrackID ID="${trackingNumber}"></TrackID></TrackFieldRequest>`;
  const url = `${USPS_API_BASE}${USPS_TRACK_PATH}${encodeURIComponent(xml)}`;
  const res = await axios.get(url);
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
  const apiKey = await getUspsApiKey();
  // Build XML payload according to USPS Ship API spec:
  const xml = `
    <PriorityMailIntlRequest USERID="${apiKey}">
      <Revision>2</Revision>
      <ImageParameters/>
      <FromName>${pickupContact.name}</FromName>
      <FromAddress1>${pickupAddress.line1}</FromAddress1>
      <!-- etc… -->
      <Pounds>${Math.floor(weight)}</Pounds>
      <Ounces>${((weight % 1) * 16).toFixed(1)}</Ounces>
      <Machinable>false</Machinable>
      <POZipCode>${pickupAddress.postalCode}</POZipCode>
      <ToName>${deliveryContact.name}</ToName>
      <ToAddress1>${deliveryAddress.line1}</ToAddress1>
      <!-- … -->
      <ValueOfContents>${insurance ? 100 : 0}</ValueOfContents>
      <ReferenceID>${reference}</ReferenceID>
    </PriorityMailIntlRequest>`;
  const url = `${USPS_API_BASE}${USPS_SHIP_PATH}${encodeURIComponent(xml)}`;
  const res = await axios.get(url);
  return res.data; // parse label/tracking from XML
}

module.exports = { trackShipment, createShipment };