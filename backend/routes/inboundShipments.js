const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const inboundController = require('../controllers/inboundShipmentController');

// Log an inbound shipment (admin, dispatcher, or warehouse_admin)
router.post('/', requireAuth, requireRole(['admin','dispatcher','warehouse_admin']), inboundController.logInboundShipment);

module.exports = router; 