

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const carrierController = require('../controllers/carrierController');

// List all carriers (admin only)
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  carrierController.listCarriers
);

// Get a specific carrier by ID (admin only)
router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  carrierController.getCarrier
);

// Create a new carrier (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  carrierController.createCarrier
);

// Update an existing carrier (admin only)
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  carrierController.updateCarrier
);

// Delete a carrier (admin only)
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  carrierController.deleteCarrier
);

module.exports = router;