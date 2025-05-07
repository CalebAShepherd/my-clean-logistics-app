const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const outboundController = require('../controllers/outboundShipmentController');

// Log an outbound shipment (admin, dispatcher, or warehouse_admin)
router.post('/', requireAuth, requireRole(['admin','dispatcher','warehouse_admin']), outboundController.logOutboundShipment);

module.exports = router; 