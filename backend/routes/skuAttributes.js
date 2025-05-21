const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const skuAttributeController = require('../controllers/skuAttributeController');

// List attribute definitions
router.get('/', requireAuth, requireRole(['admin','warehouse_admin']), skuAttributeController.getDefinitions);

// Get a single attribute definition
router.get('/:id', requireAuth, requireRole(['admin','warehouse_admin']), skuAttributeController.getDefinition);

// Create a new attribute definition
router.post('/', requireAuth, requireRole(['admin','warehouse_admin']), skuAttributeController.createDefinition);

// Update an attribute definition
router.put('/:id', requireAuth, requireRole(['admin','warehouse_admin']), skuAttributeController.updateDefinition);

// Delete an attribute definition
router.delete('/:id', requireAuth, requireRole(['admin','warehouse_admin']), skuAttributeController.deleteDefinition);

module.exports = router; 