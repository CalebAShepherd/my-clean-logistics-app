const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const locationController = require('../controllers/locationController');

// List locations (admin, dev, or warehouse_admin)
router.get('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.getLocations);

// Get a single location
router.get('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.getLocation);

// Create a new location
router.post('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.createLocation);

// Update a location
router.put('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.updateLocation);

// Delete a location
router.delete('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.deleteLocation);

module.exports = router; 