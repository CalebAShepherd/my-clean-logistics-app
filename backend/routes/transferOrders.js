const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const transferOrderController = require('../controllers/transferOrderController');

// List transfer orders
router.get('/', requireAuth, requireRole('admin'), transferOrderController.getTransferOrders);

// Get a single transfer order by ID
router.get('/:id', requireAuth, requireRole('admin'), transferOrderController.getTransferOrder);

// Create a new transfer order
router.post('/', requireAuth, requireRole('admin'), transferOrderController.createTransferOrder);

// Update an existing transfer order
router.put('/:id', requireAuth, requireRole('admin'), transferOrderController.updateTransferOrder);

// Delete a transfer order
router.delete('/:id', requireAuth, requireRole('admin'), transferOrderController.deleteTransferOrder);

module.exports = router; 