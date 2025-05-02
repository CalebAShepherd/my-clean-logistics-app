const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  trackShipment: fedexTrack,
  createShipment: fedexCreate,
  validateAddress: fedexValidate,
  getRates: fedexRates,
  requestPickup: fedexPickup
} = require('../services/fedex');
const upsService = require('../services/ups');
const dhlService = require('../services/dhl');
const uspsService = require('../services/usps');
const xpoService = require('../services/xpo');
const rlService = require('../services/rlCarriers');
const odflService = require('../services/oldDominion');
const estesService = require('../services/estesExpress');
const tforceService = require('../services/tForceFreight');

// Create a new shipment request
exports.createShipment = async (req, res) => {
  console.log('createShipment req.user =', req.user);
  try {
    const {
      origin,
      destination,
      description,
      weight,
      pickup,
      delivery,
      shipmentDate,
      dimensions,
      quantity,
      specialInstructions,
      insurance,
      reference
    } = req.body;

    // Create shipment record
    const shipment = await prisma.shipment.create({
      data: {
        origin,
        destination,
        description,
        weight,
        pickupName: pickup.name,
        pickupPhone: pickup.phone,
        pickupEmail: pickup.email,
        deliveryName: delivery.name,
        deliveryPhone: delivery.phone,
        deliveryEmail: delivery.email,
        shipmentDate: new Date(shipmentDate),
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        quantity,
        specialInstructions,
        insurance,
        reference,
        status: 'CREATED',
        client: {
          connect: { id: req.user.id }
        }
      },
      include: { serviceCarrier: true, client: true }
    });

    return res.status(201).json(shipment);
  } catch (err) {
    console.error('Error creating shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update shipment status
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await prisma.shipment.update({
      where: { id },
      data: { status },
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating shipment status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List shipments by status
exports.listShipments = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      include: { serviceCarrier: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Returning ${shipments.length} shipments`);

    return res.json(shipments);
  } catch (err) {
    console.error('Error listing shipments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single shipment by ID
 */
exports.getShipment = async (req, res) => {
  console.log('getShipment called with id:', req.params.id);
  const { id } = req.params;
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { serviceCarrier: true },
    });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    console.log('getShipment returning shipment:', shipment);
    return res.json(shipment);
  } catch (err) {
    console.error('Error fetching shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.assignCarrier = async (req, res) => {
    const { id } = req.params;
    const { carrierId, trackingNumber } = req.body;
    console.log('assignCarrier called with id:', id, 'carrierId:', carrierId, 'trackingNumber:', trackingNumber);

    // Validate that the carrier exists
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId } });
    if (!carrier) {
      return res.status(400).json({ error: 'Invalid carrierId' });
    }

    // Update using the proper relation field
    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        serviceCarrierId: carrierId,
        trackingNumber,
      },
    });
    console.log('assignCarrier updated shipment:', updated);
    return res.json(updated);
  };

// Track shipment with the assigned carrier
exports.trackShipment = async (req, res) => {
  const { id } = req.params;
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { serviceCarrier: true },
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    const { serviceCarrier, trackingNumber } = shipment;
    if (!serviceCarrier || !trackingNumber) {
      return res.status(400).json({ error: 'Carrier or tracking number missing' });
    }
    let data;
    switch (serviceCarrier.code) {
      case 'FEDEX':
        data = await fedexTrack(trackingNumber);
        break;
      case 'UPS':
        data = await upsService.trackShipment(trackingNumber);
        break;
      case 'DHL':
        data = await dhlService.trackShipment(trackingNumber);
        break;
      case 'USPS':
        data = await uspsService.trackShipment(trackingNumber);
        break;
      case 'XPO':
        data = await xpoService.trackShipment(trackingNumber);
        break;
      case 'RL':
        data = await rlService.trackShipment(trackingNumber);
        break;
      case 'ODFL':
        data = await odflService.trackShipment(trackingNumber);
        break;
      case 'ESTES':
        data = await estesService.trackShipment(trackingNumber);
        break;
      case 'TFORCE':
        data = await tforceService.trackShipment(trackingNumber);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported carrier' });
    }
    return res.json({ carrier: serviceCarrier.code, tracking: data });
  } catch (err) {
    console.error('Error tracking shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Book (create) shipment with the assigned carrier’s API
exports.bookShipment = async (req, res) => {
  const { id } = req.params;
  try {
    // Load shipment with carrier and details
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { serviceCarrier: true },
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    const { serviceCarrier, trackingNumber, origin, destination, pickupName, pickupPhone, pickupEmail, deliveryName, deliveryPhone, deliveryEmail, weight, length, width, height, quantity, specialInstructions, insurance, reference, description } = shipment;
    if (!serviceCarrier) {
      return res.status(400).json({ error: 'Carrier not assigned' });
    }

    // Prepare payload
    const payload = {
      pickupAddress: origin,
      pickupContact: { name: pickupName, phone: pickupPhone, email: pickupEmail },
      deliveryAddress: destination,
      deliveryContact: { name: deliveryName, phone: deliveryPhone, email: deliveryEmail },
      weight,
      dimensions: { length, width, height },
      reference,
      insurance,
      description,
      quantity,
    };

    // Call carrier-specific createShipment
    let booking;
    switch (serviceCarrier.code) {
      case 'FEDEX':
        booking = await fedexCreate(payload);
        break;
      case 'UPS':
        booking = await upsService.createShipment(payload);
        break;
      case 'DHL':
        booking = await dhlService.createShipment(payload);
        break;
      case 'USPS':
        booking = await uspsService.createShipment(payload);
        break;
      case 'XPO':
        booking = await xpoService.createShipment(payload);
        break;
      case 'RL':
        booking = await rlService.createShipment(payload);
        break;
      case 'ODFL':
        booking = await odflService.createShipment(payload);
        break;
      case 'ESTES':
        booking = await estesService.createShipment(payload);
        break;
      case 'TFORCE':
        booking = await tforceService.createShipment(payload);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported carrier for booking' });
    }

    // Persist booking details (e.g., trackingNumber, labelUrl)
    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        trackingNumber: booking.trackingNumber || trackingNumber,
        status: 'BOOKED',
        // if carrier returns label URL or PDF link:
        labelUrl: booking.labelUrl || null,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error booking shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Validate an address via FedEx
 */
exports.validateAddress = async (req, res) => {
  try {
    const result = await fedexValidate(req.body);
    return res.json(result);
  } catch (err) {
    console.error('Error validating address:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get rate quotes via carrier API
 */
exports.getRates = async (req, res) => {
  const { serviceCarrierCode, ...ratePayload } = req.body;
  try {
    let result;
    switch (serviceCarrierCode) {
      case 'FEDEX':
        result = await fedexRates(ratePayload);
        break;
      case 'DHL':
        result = await dhlService.getRates(ratePayload);
        break;
      case 'UPS':
        result = await upsService.getRates(ratePayload);
        break;
      case 'USPS':
        result = await uspsService.getRates(ratePayload);
        break;
      case 'XPO':
        result = await xpoService.getRates(ratePayload);
        break;
      case 'RL':
        result = await rlService.getRates(ratePayload);
        break;
      case 'ODFL':
        result = await odflService.getRates(ratePayload);
        break;
      case 'ESTES':
        result = await estesService.getRates(ratePayload);
        break;
      case 'TFORCE':
        result = await tforceService.getRates(ratePayload);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported carrier for rates' });
    }
    return res.json(result);
  } catch (err) {
    console.error('Error getting rates:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Schedule a pickup via carrier API
 */
exports.requestPickup = async (req, res) => {
  const { serviceCarrierCode, ...pickupPayload } = req.body;
  try {
    let result;
    switch (serviceCarrierCode) {
      case 'FEDEX':
        result = await fedexPickup(pickupPayload);
        break;
      case 'DHL':
        result = await dhlService.requestPickup(pickupPayload);
        break;
      case 'UPS':
        result = await upsService.requestPickup(pickupPayload);
        break;
      case 'USPS':
        result = await uspsService.requestPickup(pickupPayload);
        break;
      case 'XPO':
        result = await xpoService.requestPickup(pickupPayload);
        break;
      case 'RL':
        result = await rlService.requestPickup(pickupPayload);
        break;
      case 'ODFL':
        result = await odflService.requestPickup(pickupPayload);
        break;
      case 'ESTES':
        result = await estesService.requestPickup(pickupPayload);
        break;
      case 'TFORCE':
        result = await tforceService.requestPickup(pickupPayload);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported carrier for pickup' });
    }
    return res.json(result);
  } catch (err) {
    console.error('Error requesting pickup:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generic track by tracking number (FedEx sandbox only)
 */
exports.genericTrack = async (req, res) => {
  const { trackingNumber } = req.query;
  if (!trackingNumber) {
    return res.status(400).json({ error: 'Missing trackingNumber query param' });
  }
  try {
    // Use your FedEx service helper
    const data = await require('../services/fedex').trackShipment(trackingNumber);
    return res.json({ tracking: data });
  } catch (err) {
    console.error('genericTrack error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};