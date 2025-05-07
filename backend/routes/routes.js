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

// List routes (optional filter by transporterId)
router.get(
  '/',
  requireAuth,
  requireRole(['dispatcher','admin','transporter']),
  routeController.listRoutes
);

// Get a single route
router.get(
  '/:id',
  requireAuth,
  requireRole(['dispatcher','admin','transporter']),
  routeController.getRoute
);

module.exports = router; 