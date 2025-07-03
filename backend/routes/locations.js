const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const locationController = require('../controllers/locationController');
const userController = require('../controllers/userController');

// Get location hierarchy for hierarchical pickers (must come before /:id route)
router.get('/hierarchy', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.getLocationHierarchy);

// GET /fleet (admin, dev, dispatcher, or client fetch all transporter locations)
router.get('/fleet', requireAuth, requireRole(['admin','dev','dispatcher','client']), userController.getFleetLocations);

// POST /fleet-location (transporter updates their location)
router.post('/fleet-location', requireAuth, requireRole(['transporter']), userController.updateTransporterLocation);

// List locations (admin, dev, or warehouse_admin)
router.get('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.getLocations);

// Get a single location
router.get('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.getLocation);

// Create a new location
router.post('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.createLocation);

// Update a location
router.put('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.updateLocation);

// Delete all locations (must come before /:id route)
router.delete('/', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.deleteAllLocations);

// Delete a location
router.delete('/:id', requireAuth, requireRole(['admin','dev','warehouse_admin']), locationController.deleteLocation);

module.exports = router; 