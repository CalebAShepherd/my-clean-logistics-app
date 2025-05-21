const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendNotification } = require('../services/notificationService');

// POST /offers
exports.createOffer = async (req, res) => {
  const { routeId, transporterId } = req.body;
  if (!routeId || !transporterId) {
    return res.status(400).json({ error: 'routeId and transporterId are required' });
  }
  try {
    // Ensure route exists
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) return res.status(404).json({ error: 'Route not found' });
    // Create offer
    const offer = await prisma.offer.create({ data: { routeId, transporterId, status: 'pending' } });
    // Send notification to targeted transporter
    try {
      await sendNotification({
        userId: transporterId,
        type: 'new_route_offer',
        title: 'New Route Offer',
        message: `You have a new route offer for route ${routeId}.`,
        metadata: { offerId: offer.id, routeId }
      });
    } catch (notifErr) {
      console.error('Error sending route offer notification:', notifErr);
    }
    return res.status(201).json(offer);
  } catch (err) {
    console.error('Error creating offer:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /offers
exports.listOffers = async (req, res) => {
  const userId = req.user.id;
  try {
    // List pending offers for this transporter
    const offers = await prisma.offer.findMany({
      where: { transporterId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        Route: {
          include: {
            RouteShipment: {
              include: { Shipment: true },
              orderBy: { order: 'asc' }
            },
            User: true
          }
        },
        User: true
      }
    });
    return res.json(offers);
  } catch (err) {
    console.error('Error listing offers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /offers/:id
exports.updateOffer = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending','accepted','declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    // Only the transporter can update their offer
    if (offer.transporterId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Update offer status
    const updated = await prisma.offer.update({ where: { id }, data: { status } });
    return res.json(updated);
  } catch (err) {
    console.error('Error updating offer:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 