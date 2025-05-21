const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const routeController = require('../controllers/routeController');

// Optimize route (dispatcher, admin, transporter)
router.post(
  '/optimize',
  requireAuth,
  requireRole(['dispatcher','admin','transporter']),
  routeController.optimizeRoute
);

// Create a new route (dispatcher, admin)
router.post(
  '/',
  requireAuth,
  requireRole(['dispatcher','admin']),
  routeController.createRoute
);

// List routes (optional filter by transporterId)
router.get(
  '/',
  requireAuth,
  requireRole(['dispatcher','admin','transporter','client']),
  routeController.listRoutes
);

// Get a single route
router.get(
  '/:id',
  requireAuth,
  requireRole(['dispatcher','admin','transporter','client']),
  routeController.getRoute
);

// Mark a stop as completed
router.patch(
  '/:routeId/stops/:shipmentId/complete',
  requireAuth,
  requireRole(['transporter','dispatcher','admin']),
  routeController.completeStop
);

// Mark a stop as skipped
router.patch(
  '/:routeId/stops/:shipmentId/skip',
  requireAuth,
  requireRole(['transporter','dispatcher','admin']),
  routeController.skipStop
);

// DELETE /routes/:id - cancel a route and remove its stops
router.delete(
  '/:id',
  requireAuth,
  requireRole(['dispatcher','admin']),
  routeController.deleteRoute
);

module.exports = router; 