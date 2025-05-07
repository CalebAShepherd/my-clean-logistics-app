const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const offerController = require('../controllers/offerController');

// Create a new offer (dispatcher or admin)
router.post(
  '/',
  requireAuth,
  requireRole(['dispatcher','admin']),
  offerController.createOffer
);

// List offers for the authenticated transporter
router.get(
  '/',
  requireAuth,
  requireRole('transporter'),
  offerController.listOffers
);

// Update offer status (accept or decline)
router.patch(
  '/:id',
  requireAuth,
  requireRole('transporter'),
  offerController.updateOffer
);

module.exports = router; 