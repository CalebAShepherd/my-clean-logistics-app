const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const stockMovementController = require('../controllers/stockMovementController');

// List all stock movements
router.get('/', requireAuth, requireRole('admin'), stockMovementController.getStockMovements);

// Get a single stock movement by ID
router.get('/:id', requireAuth, requireRole('admin'), stockMovementController.getStockMovement);

// Create a new stock movement record
router.post('/', requireAuth, requireRole('admin'), stockMovementController.createStockMovement);

// Update an existing stock movement
router.put('/:id', requireAuth, requireRole('admin'), stockMovementController.updateStockMovement);

// Delete a stock movement record
router.delete('/:id', requireAuth, requireRole('admin'), stockMovementController.deleteStockMovement);

module.exports = router; 