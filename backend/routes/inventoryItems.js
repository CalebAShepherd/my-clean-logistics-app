const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const inventoryItemController = require('../controllers/inventoryItemController');

// Get all inventory items
router.get('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), inventoryItemController.getInventoryItems);

// Get a single inventory item by ID
router.get('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), inventoryItemController.getInventoryItem);

// Create a new inventory item
router.post('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), inventoryItemController.createInventoryItem);

// Update an existing inventory item
router.put('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), inventoryItemController.updateInventoryItem);

// Delete an inventory item
router.delete('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), inventoryItemController.deleteInventoryItem);

module.exports = router; 