const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { captureShipmentDelivery } = require('../middleware/integrationMiddleware');
const shipmentController = require('../controllers/shipmentController');

// Create a new shipment request (client)
router.post('/', requireAuth, shipmentController.createShipment);

// List shipments by status (admin/dispatcher)
router.get('/', requireAuth, shipmentController.listShipments);

// Export shipments as CSV or PDF (admin/dispatcher)
router.get(
  '/export',
  requireAuth,
  requireRole(['admin','dispatcher']),
  shipmentController.exportShipments
);

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

// GET /recent - 4 most recent shipments (admin, dispatcher, warehouse_admin)
router.get('/recent', requireAuth, requireRole(['admin','dispatcher','warehouse_admin']), shipmentController.getRecentShipments);

router.get('/:id', requireAuth, shipmentController.getShipment);

// Get shipment status update history
router.get('/:id/updates', requireAuth, shipmentController.listShipmentUpdates);

// Get a single shipment by ID
router.get(
  '/:id',
  requireAuth,
  shipmentController.getShipment
);

// Update shipment status (admin, dispatcher, or transporter)
router.put(
  '/:id/status',
  requireAuth,
  requireRole(['admin', 'dispatcher', 'transporter']),
  captureShipmentDelivery,
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
  requireRole(['dispatcher','client']),
  shipmentController.getRates
);

// Schedule a pickup via carrier API
router.post(
  '/pickup',
  requireAuth,
  requireRole('dispatcher'),
  shipmentController.requestPickup
);

// Assign a shipment to a warehouse (admin, dispatcher, warehouse_admin)
router.post(
  '/:id/assign-warehouse',
  requireAuth,
  (req, res, next) => {
    const role = req.user.role;
    if (!['admin', 'dispatcher', 'warehouse_admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  },
  shipmentController.assignWarehouse
);

// Edit a shipment (client, admin, dispatcher)
router.patch('/:id', requireAuth, shipmentController.editShipment);

// Delete a shipment (client, admin, dispatcher)
router.delete('/:id', requireAuth, shipmentController.deleteShipment);

module.exports = router;