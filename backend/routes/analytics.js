const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const analyticsController = require('../controllers/analyticsController');

// On-time vs late deliveries
router.get(
  '/deliveries',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.onTimeLate
);

// Total completed deliveries
router.get(
  '/completed',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.completedCount
);

// Delivery volume trends
router.get(
  '/trends',
  requireAuth,
  requireRole(['admin','dispatcher']),
  analyticsController.trends
);

// Warehouse analytics endpoints
router.get(
  '/warehouse/turnover',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.stockTurnover
);
router.get(
  '/warehouse/usage',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.spaceUsage
);
router.get(
  '/warehouse/receiving-speed',
  requireAuth,
  requireRole(['admin','dev','warehouse_admin']),
  analyticsController.receivingSpeed
);

module.exports = router; 