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
const cityCentroids = require('../services/cityCentroids');
const PDFDocument = require('pdfkit');
const { sendNotification } = require('../services/notificationService');

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
      palletCount,
      specialInstructions,
      insurance,
      hazmat,
      reference,
      pickupStreet,
      pickupCity,
      pickupState,
      pickupZip,
      deliveryStreet,
      deliveryCity,
      deliveryState,
      deliveryZip
    } = req.body;

    // Build full origin/destination from split fields
    const originFull = [pickupStreet, pickupCity, pickupState, pickupZip].filter(Boolean).join(', ');
    const destinationFull = [deliveryStreet, deliveryCity, deliveryState, deliveryZip].filter(Boolean).join(', ');

    // Lookup city centroids
    function lookupCityLatLng(city, state) {
      if (!city || !state) return null;
      const key = `${city.trim().toLowerCase()},${state.trim().toLowerCase()}`;
      return cityCentroids[key] || null;
    }
    const pickupCentroid = lookupCityLatLng(pickupCity, pickupState);
    const deliveryCentroid = lookupCityLatLng(deliveryCity, deliveryState);

    // Create shipment record
    const shipment = await prisma.shipment.create({
      data: {
        origin: originFull,
        destination: destinationFull,
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
        palletCount,
        specialInstructions,
        insurance,
        hazmat,
        reference,
        status: 'CREATED',
        pickupStreet,
        pickupCity,
        pickupState,
        pickupZip,
        deliveryStreet,
        deliveryCity,
        deliveryState,
        deliveryZip,
        originLat: pickupCentroid?.lat ?? null,
        originLng: pickupCentroid?.lng ?? null,
        destinationLat: deliveryCentroid?.lat ?? null,
        destinationLng: deliveryCentroid?.lng ?? null,
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
  const { status, notes } = req.body;
  try {
    // Update shipment status
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: { status },
    });
    // Record status change in shipmentUpdates
    const shipmentUpdate = await prisma.shipmentUpdate.create({
      data: { shipmentId: id, status, notes },
    });
    // Send a notification to the client about status change
    try {
      await sendNotification({
        userId: updatedShipment.clientId,
        type: 'shipment_status',
        title: `Shipment status updated to ${status}`,
        message: notes || null,
        metadata: { shipmentId: id, status }
      });
    } catch (notifErr) {
      console.error('Error sending notification:', notifErr);
    }
    // Notify transporter when shipment is delivered
    if (status === 'DELIVERED' && updatedShipment.transporterId) {
      try {
        await sendNotification({
          userId: updatedShipment.transporterId,
          type: 'delivery_confirmed',
          title: `Shipment ${id} delivered`,
          message: null,
          metadata: { shipmentId: id }
        });
      } catch (err) {
        console.error('Error sending delivery confirmation to transporter:', err);
      }
    }
    // Return both updated shipment and the update record
    return res.json({ shipment: updatedShipment, update: shipmentUpdate });
  } catch (err) {
    console.error('Error updating shipment status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// List shipments by status
exports.listShipments = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      include: {
        serviceCarrier: true,
        client: { select: { username: true } }
      },
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
      include: {
        serviceCarrier: true,
        documents: true,
        shipmentUpdates: { orderBy: { createdAt: 'asc' } },
      },
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

// Book (create) shipment with the assigned carrier's API
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
  // DEV STUB: return dummy rate quotes for client UI
  return res.json([
    { carrier: serviceCarrierCode, rate: 100.00, currency: 'USD', estimatedDelivery: '2 business days' }
  ]);
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
    // Send notification about rate quote ready if shipmentId provided
    try {
      if (ratePayload.shipmentId) {
        const shipment = await prisma.shipment.findUnique({ where: { id: ratePayload.shipmentId } });
        if (shipment) {
          const notifyUserId = req.user.role === 'dispatcher' ? shipment.clientId : shipment.dispatcherId;
          if (notifyUserId) {
            await sendNotification({
              userId: notifyUserId,
              type: 'rate_quote_ready',
              title: 'Rate Quotes Available',
              message: `Rate quotes are ready for shipment ${shipment.id}.`,
              metadata: { shipmentId: shipment.id }
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Error sending rate quote notification:', notifErr);
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

/**
 * Assign a shipment to a warehouse
 * POST /api/shipments/:id/assign-warehouse
 * Body: { warehouseId }
 */
exports.assignWarehouse = async (req, res) => {
  const { id } = req.params;
  const { warehouseId } = req.body;
  try {
    // Validate shipment exists
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    // If warehouseId is not null, validate warehouse exists
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        return res.status(400).json({ error: 'Invalid warehouseId' });
      }
    }
    // Update shipment (allow null)
    const updated = await prisma.shipment.update({
      where: { id },
      data: { warehouseId: warehouseId || null },
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error assigning warehouse:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get inbound shipments for a warehouse, filtered by status
 * GET /api/warehouses/:id/inbound-shipments?status=IN_TRANSIT
 */
exports.getInboundShipmentsForWarehouse = async (req, res) => {
  const warehouseId = req.params.id;
  const { status } = req.query;
  if (!warehouseId) {
    return res.status(400).json({ error: 'warehouseId is required' });
  }
  if (!status) {
    return res.status(400).json({ error: 'status query param is required' });
  }
  try {
    const shipments = await prisma.shipment.findMany({
      where: {
        warehouseId,
        status,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(shipments);
  } catch (err) {
    console.error('Error fetching inbound shipments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /shipments/recent - 4 most recent shipments with status, client, and ETA
exports.getRecentShipments = async (req, res) => {
  try {
    // Try to get shipments from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let shipments = await prisma.shipment.findMany({
      where: {
        OR: [
          { createdAt: { gte: thirtyDaysAgo } },
          { updatedAt: { gte: thirtyDaysAgo } },
        ],
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 4,
      include: {
        client: { select: { username: true, email: true } },
      },
    });
    // If none found, get the 4 most recent regardless of age
    if (shipments.length === 0) {
      shipments = await prisma.shipment.findMany({
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 4,
        include: {
          client: { select: { username: true, email: true } },
        },
      });
    }
    // Add ETA placeholder (could be calculated in future)
    const withEta = shipments.map(s => ({
      id: s.id,
      status: s.status,
      client: s.client?.username || s.client?.email || 'N/A',
      eta: s.deliveredAt || null, // Placeholder: use deliveredAt or null
      createdAt: s.createdAt,
    }));
    return res.json(withEta);
  } catch (err) {
    console.error('Error fetching recent shipments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/shipments/:id - Edit shipment (client, admin, dispatcher)
exports.editShipment = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    // Find shipment
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    // Only client (owner), admin, or dispatcher can edit
    if (
      user.role !== 'admin' &&
      user.role !== 'dispatcher' &&
      shipment.clientId !== user.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Build update data from allowed fields
    const allowedFields = [
      'description','weight','pickupName','pickupPhone','pickupEmail','deliveryName','deliveryPhone','deliveryEmail','shipmentDate','length','width','height','quantity','specialInstructions','insurance','hazmat','reference','pickupStreet','pickupCity','pickupState','pickupZip','deliveryStreet','deliveryCity','deliveryState','deliveryZip','origin','destination'
    ];
    const data = {};
    for (const field of allowedFields) {
      if (field in req.body) data[field] = req.body[field];
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const updated = await prisma.shipment.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('Error editing shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/shipments/:id - Delete shipment (client, admin, dispatcher)
exports.deleteShipment = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    if (
      user.role !== 'admin' &&
      user.role !== 'dispatcher' &&
      shipment.clientId !== user.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.shipment.delete({ where: { id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting shipment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Export shipments as CSV or PDF
 */
exports.exportShipments = async (req, res) => {
  try {
    const { status, search, format = 'csv' } = req.query;
    // Fetch all shipments with client
    let shipments = await prisma.shipment.findMany({
      include: { client: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    // Filter by status
    shipments = shipments.filter(s => {
      const st = s.status.trim().toUpperCase();
      if (status) {
        const up = status.toUpperCase();
        if (up === 'CREATED') return st === 'CREATED' || st === 'ASSIGNED';
        if (up === 'IN_TRANSIT') return st === 'IN_TRANSIT' || st === 'OUT_FOR_DEL';
        return st === up;
      }
      return true;
    });
    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      shipments = shipments.filter(s => (
        (s.reference || s.id).toLowerCase().includes(q) ||
        s.client?.username?.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q)
      ));
    }
    // CSV export
    if (format === 'csv') {
      const header = ['Order ID','Status','Client','Origin','Destination','Weight','Shipment Date','Delivered At'];
      const rows = shipments.map(s => [
        s.reference || s.id,
        s.status,
        s.client?.username || '',
        s.origin,
        s.destination,
        s.weight,
        s.shipmentDate.toISOString(),
        s.deliveredAt ? s.deliveredAt.toISOString() : ''
      ]);
      // Helper to escape CSV
      const escape = v => '"' + String(v).replace(/"/g, '""') + '"';
      const csv = [header.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="shipments-${Date.now()}.csv"`);
      return res.send(csv);
    }
    // PDF export
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="shipments-${Date.now()}.pdf"`);
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(18).text('Shipments Export', { align: 'center' });
      doc.moveDown();
      // Table header
      const headers = ['Order ID','Status','Client','Origin','Destination','Date'];
      headers.forEach((h, i) => {
        doc.fontSize(10).text(h, { continued: i < headers.length - 1, width: 90 });
      });
      doc.moveDown(0.5);
      shipments.forEach(s => {
        const row = [s.reference || s.id, s.status, s.client?.username || '', s.origin, s.destination, new Date(s.shipmentDate).toLocaleString()];
        row.forEach((v, i) => {
          doc.fontSize(8).text(String(v), { continued: i < row.length - 1, width: 90 });
        });
        doc.moveDown(0.2);
      });
      doc.end();
      return;
    }
    // Unsupported format
    return res.status(400).json({ error: 'Unsupported export format' });
  } catch (err) {
    console.error('Error exporting shipments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * List shipment update history
 */
exports.listShipmentUpdates = async (req, res) => {
  const { id } = req.params;
  try {
    const updates = await prisma.shipmentUpdate.findMany({
      where: { shipmentId: id },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(updates);
  } catch (err) {
    console.error('Error listing shipment updates:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};