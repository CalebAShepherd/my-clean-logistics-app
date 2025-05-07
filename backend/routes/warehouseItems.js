const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const warehouseItemController = require('../controllers/warehouseItemController');

// List warehouse items
router.get('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), warehouseItemController.getWarehouseItems);

// Get a single warehouse item by composite key
router.get('/:warehouseId/:itemId', requireAuth, requireRole(['admin','dev','warehouse_admin']), warehouseItemController.getWarehouseItem);

// Create a new warehouse item record
router.post('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), warehouseItemController.createWarehouseItem);

// Update an existing warehouse item
router.put('/:warehouseId/:itemId', requireAuth, requireRole(['admin','dev','warehouse_admin']), warehouseItemController.updateWarehouseItem);

// Delete a warehouse item record
router.delete('/:warehouseId/:itemId', requireAuth, requireRole(['admin','dev','warehouse_admin']), warehouseItemController.deleteWarehouseItem);

module.exports = router; 