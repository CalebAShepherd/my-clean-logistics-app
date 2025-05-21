const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const supplierController = require('../controllers/supplierController');

// Get all suppliers
router.get('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), supplierController.getSuppliers);

// Get a single supplier by ID
router.get('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), supplierController.getSupplier);

// Create a new supplier
router.post('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), supplierController.createSupplier);

// Update an existing supplier
router.put('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), supplierController.updateSupplier);

// Delete a supplier
router.delete('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), supplierController.deleteSupplier);

module.exports = router; 