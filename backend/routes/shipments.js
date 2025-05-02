const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const shipmentController = require('../controllers/shipmentController');

// Create a new shipment request (client)
router.post('/', requireAuth, shipmentController.createShipment);

// List shipments by status (admin/dispatcher)
router.get('/', requireAuth, shipmentController.listShipments);

// Generic tracking by number (FedEx sandbox)
router.get(
  '/track',
  requireAuth,
  (req, res, next) => {
    if (!['dispatcher','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  },
  shipmentController.genericTrack
);

router.get('/:id', requireAuth, shipmentController.getShipment);

// Get a single shipment by ID
router.get(
  '/:id',
  requireAuth,
  shipmentController.getShipment
);

// Update shipment status (dispatcher or admin)
router.put(
  '/:id/status',
  requireAuth,
  (req, res, next) => {
    const role = req.user.role;
    if (role !== 'dispatcher' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  },
  shipmentController.updateStatus
);

// Assign a carrier + tracking # (dispatcher/admin only)
router.put(
    '/:id/assign',
    requireAuth,
    (req, res, next) => {
        const role = req.user.role;
        if (role !== 'dispatcher' && role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    },
    shipmentController.assignCarrier
);

// Track shipment status from carrier API
router.get(
  '/:id/track',
  requireAuth,
  shipmentController.trackShipment
);

// Book shipment with carrier API
router.put(
  '/:id/book',
  requireAuth,
  requireRole('dispatcher'),
  shipmentController.bookShipment
);

// Validate an address via carrier API
router.post(
  '/validate-address',
  requireAuth,
  requireRole('dispatcher'),
  shipmentController.validateAddress
);

// Get rate quotes via carrier API
router.post(
  '/rates',
  requireAuth,
  requireRole('dispatcher'),
  shipmentController.getRates
);

// Schedule a pickup via carrier API
router.post(
  '/pickup',
  requireAuth,
  requireRole('dispatcher'),
  shipmentController.requestPickup
);

module.exports = router;